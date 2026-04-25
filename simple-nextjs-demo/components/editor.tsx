import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Menu,
  PageHeader,
} from '@arco-design/web-react';
import { IconLeft } from '@arco-design/web-react/icon';
import mjml from 'mjml-browser';
import { saveAs } from 'file-saver';
import {
  EmailEditor,
  EmailEditorProvider,
  IEmailTemplate,
  Stack,
} from 'easy-email-editor';

import { JsonToMjml } from 'easy-email-core';
import { SimpleLayout, BlockMarketManager, BlockMaskWrapper } from 'easy-email-extensions';

import '@arco-themes/react-easy-email-theme/css/arco.css';
import 'easy-email-editor/lib/style.css';
import 'easy-email-extensions/lib/style.css';

import enUS from '@arco-design/web-react/es/locale/en-US';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTemplate, updateTemplate } from '@/lib/templates';
import { getVersions, createVersion, TemplateVersion } from '@/lib/versions';
import { createComponent, getComponents, Component } from '@/lib/components';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function getSectionLabel(section: any, index: number): string {
  const children = section?.children?.[0]?.children || [];
  for (const child of children) {
    if (child.type === 'text') {
      const content = child?.data?.value?.content || '';
      const text = content.replace(/<[^>]*>/g, '').trim();
      if (text) return text.substring(0, 50);
    }
  }
  const bg = section?.attributes?.['background-color'] || '';
  if (bg) return `Section ${index + 1} (${bg})`;
  return `Section ${index + 1}`;
}

function renderSectionHtml(section: any, pageContent: any): string {
  try {
    const wrapped = { ...pageContent, children: [section] };
    const mjmlString = JsonToMjml({ data: wrapped, mode: 'production', context: wrapped });
    const { html } = mjml(mjmlString, {});
    return html;
  } catch {
    return '';
  }
}

export default function Editor() {
  const [template, setTemplate] = useState<IEmailTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [savingVersion, setSavingVersion] = useState(false);
  const [savingComponent, setSavingComponent] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  const [testEmail, setTestEmail] = useState('');
  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailError, setTestEmailError] = useState('');

  const [compOpen, setCompOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [compCategory, setCompCategory] = useState('Custom');
  const [compSectionIdx, setCompSectionIdx] = useState<number>(0);
  const [compPreselected, setCompPreselected] = useState(false);

  const currentValuesRef = useRef<IEmailTemplate | null>(null);

  const id = useSearchParams().get('id');
  const router = useRouter();

  const onUploadImage = async (blob: Blob) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return URL.createObjectURL(blob);

    const ext = blob.type.split('/')[1] || 'png';
    const filename = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('email-images')
      .upload(filename, blob, { contentType: blob.type, upsert: false });

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      return URL.createObjectURL(blob);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('email-images')
      .getPublicUrl(filename);

    return publicUrl;
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getTemplate(id)
      .then((data) => {
        setTemplateName(data.name);
        setTemplate({
          content: data.content as any,
          subject: data.name,
          subTitle: data.category,
        });
      })
      .catch((err) => {
        console.error('Failed to load template:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    getVersions(id)
      .then(setVersions)
      .catch((err) => console.error('Failed to load versions:', err));
  }, [id]);

  useEffect(() => {
    getComponents()
      .then((components) => {
        if (!components.length) return;
        const grouped = new Map<string, Component[]>();
        components.forEach((c) => {
          const cat = c.category || 'Custom';
          if (!grouped.has(cat)) grouped.set(cat, []);
          grouped.get(cat)!.push(c);
        });
        const categories = Array.from(grouped.entries()).map(([cat, items]) => {
          const blocks = items.map((comp) => {
            const section = (comp.content as any)?.children?.[0];
            if (!section) return null;
            let previewHtml = '';
            try {
              const wrapped = { ...(comp.content as any), children: [section] };
              const mjmlStr = JsonToMjml({ data: wrapped, mode: 'production', context: wrapped });
              previewHtml = mjml(mjmlStr, {}).html;
            } catch {}
            return {
              type: 'advanced_section' as const,
              title: comp.name,
              component: () => (
                <BlockMaskWrapper type={'advanced_section' as any} payload={section}>
                  <div style={{ position: 'relative', height: 80, overflow: 'hidden', borderRadius: 4, background: '#f6f6f6' }}>
                    {previewHtml ? (
                      <iframe
                        srcDoc={previewHtml}
                        style={{
                          width: 600,
                          height: 800,
                          transform: 'scale(0.2)',
                          transformOrigin: 'top left',
                          border: 'none',
                          pointerEvents: 'none',
                        }}
                        sandbox=''
                      />
                    ) : (
                      <div style={{ padding: '4px 8px', fontSize: 12, color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        {comp.name}
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.9)', padding: '2px 8px', fontSize: 11, color: '#333', fontWeight: 500, borderTop: '1px solid #eee' }}>
                      {comp.name}
                    </div>
                  </div>
                </BlockMaskWrapper>
              ),
            };
          }).filter((b): b is NonNullable<typeof b> => b != null);
          return {
            name: `SAVED_${cat.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
            title: cat,
            blocks,
          };
        });
        BlockMarketManager.addCategories(categories as any);
      })
      .catch((err) => console.error('Failed to load components:', err));
  }, []);

  const onSave = useCallback(
    async (values: IEmailTemplate) => {
      if (!id) return;
      setSaving(true);
      try {
        await updateTemplate(id, {
          content: values.content as any,
        });
      } catch (err) {
        console.error('Failed to save:', err);
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  const onSaveVersion = useCallback(
    async (values: IEmailTemplate) => {
      if (!id) return;
      setSavingVersion(true);
      try {
        const version = await createVersion(id, values.content as any);
        setVersions((prev) => [version, ...prev]);
        await onSave(values);
      } catch (err) {
        console.error('Failed to save version:', err);
      } finally {
        setSavingVersion(false);
      }
    },
    [id, onSave],
  );

  const onRestoreVersion = useCallback((version: TemplateVersion) => {
    if (!confirm(`Restore to ${version.description}? Current unsaved changes will be lost.`)) return;
    setTemplate({
      content: version.content as any,
      subject: templateName,
      subTitle: '',
    });
  }, [templateName]);

  const onOpenComponentDialog = useCallback((sectionIdx?: number) => {
    setCompName('');
    setCompCategory('Custom');
    setCompSectionIdx(sectionIdx ?? 0);
    setCompPreselected(sectionIdx !== undefined);
    setCompOpen(true);
  }, []);

  const onSaveAsComponent = useCallback(
    async (values: IEmailTemplate) => {
      if (!compName.trim()) return;
      setSavingComponent(true);
      try {
        const children = values.content?.children || [];
        const section = children[compSectionIdx];
        if (!section) {
          alert('Invalid section selected');
          return;
        }
        const pageWrapper = {
          ...values.content,
          children: [section],
        };
        await createComponent(compName.trim(), compCategory.trim() || 'Custom', pageWrapper as any);
        setCompOpen(false);
      } catch (err) {
        console.error('Failed to save component:', err);
      } finally {
        setSavingComponent(false);
      }
    },
    [compName, compCategory, compSectionIdx],
  );

  const onSaveSectionFromBar = useCallback(
    (payload: { block: any; idx: string }) => {
      const vals = currentValuesRef.current;
      if (!vals) return;
      const children = vals.content?.children || [];
      const idx = children.findIndex(
        (c: any) => c === payload.block || JSON.stringify(c) === JSON.stringify(payload.block)
      );
      if (idx >= 0) {
        onOpenComponentDialog(idx);
      }
    },
    [onOpenComponentDialog],
  );

  const onOpenTestEmail = useCallback(() => {
    setTestEmail('');
    setTestEmailError('');
    setTestEmailOpen(true);
  }, []);

  const onSendTestEmail = useCallback(
    async (values: IEmailTemplate) => {
      if (!testEmail.trim()) return;
      setTestEmailError('');
      setSendingTest(true);
      try {
        const mjmlString = JsonToMjml({
          data: values.content,
          mode: 'production',
          context: values.content,
        });
        const { html, errors } = mjml(mjmlString, {});

        if (errors?.length) {
          console.error('MJML errors:', errors);
        }

        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: testEmail.trim(),
            subject: `[Test] ${templateName || 'Email Template'}`,
            html,
          }),
        });

        if (res.ok) {
          setTestEmailOpen(false);
        } else {
          const data = await res.json();
          setTestEmailError(data.error || 'Unknown error');
        }
      } catch (err: any) {
        setTestEmailError(err.message || 'Failed to send test email');
      } finally {
        setSendingTest(false);
      }
    },
    [templateName, testEmail],
  );

  const onExportMJML = (values: IEmailTemplate) => {
    const mjmlString = JsonToMjml({
      data: values.content,
      mode: 'production',
      context: values.content,
    });
    navigator.clipboard.writeText(mjmlString);
    saveAs(new Blob([mjmlString], { type: 'text/mjml' }), 'easy-email.mjml');
  };

  const onExportHTML = (values: IEmailTemplate) => {
    const mjmlString = JsonToMjml({
      data: values.content,
      mode: 'production',
      context: values.content,
    });
    const html = mjml(mjmlString, {}).html;
    navigator.clipboard.writeText(html);
    saveAs(new Blob([html], { type: 'text/html' }), 'easy-email.html');
  };

  const onExportJSON = (values: IEmailTemplate) => {
    navigator.clipboard.writeText(JSON.stringify(values, null, 2));
    saveAs(
      new Blob([JSON.stringify(values, null, 2)], { type: 'application/json' }),
      'easy-email.json',
    );
  };

  const initialValues: IEmailTemplate | null = useMemo(() => {
    if (!template) return null;
    return template;
  }, [template]);

  const onSubmit = useCallback(
    async (values: IEmailTemplate) => {
      await onSave(values);
    },
    [onSave],
  );

  if (loading || !initialValues) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const sections = (initialValues?.content as any)?.children || [];

  return (
    <ConfigProvider locale={enUS}>
      <div>
        <EmailEditorProvider
          height={'calc(100vh - 68px)'}
          data={initialValues}
          onUploadImage={onUploadImage}
          onSubmit={onSubmit}
          onSaveSection={onSaveSectionFromBar}
          dashed={false}
        >
          {({ values }, { submit }) => {
            currentValuesRef.current = values;
            useEffect(() => {
              if (!id) return;
              const interval = setInterval(() => {
                updateTemplate(id, { content: values.content as any })
                  .then(() => setLastAutoSave(new Date()))
                  .catch(() => {});
              }, 60000);
              return () => clearInterval(interval);
            }, [id, values]);

            return (
              <>
                <PageHeader
                  style={{
                    background: 'linear-gradient(135deg, #070a43 0%, #070a43 100%)',
                    color: '#fff',
                    padding: '12px 24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  backIcon={
                    <IconLeft
                      style={{
                        color: '#fff',
                        fontSize: '20px',
                        fontWeight: 'bold',
                      }}
                    />
                  }
                  title={
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>
                      {templateName || 'Peach Email Builder'}
                      {lastAutoSave && (
                        <span style={{ fontWeight: 400, fontSize: '11px', marginLeft: 12, opacity: 0.7 }}>
                          Auto-saved {lastAutoSave.toLocaleTimeString()}
                        </span>
                      )}
                    </span>
                  }
                  onBack={() => router.push('/')}
                  extra={
                    <Stack alignment='center'>
                      <Button
                        onClick={() => submit()}
                        style={{
                          background: '#ec5228',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 'bold',
                        }}
                        loading={saving}
                      >
                        Save
                      </Button>
                      <Button
                        onClick={() => onSaveVersion(values)}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: '#fff',
                          border: 'none',
                        }}
                        loading={savingVersion}
                      >
                        Save Version
                      </Button>
                      <Button
                        onClick={() => onOpenComponentDialog()}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: '#fff',
                          border: 'none',
                        }}
                        loading={savingComponent}
                      >
                        Save Section
                      </Button>
                      <Button
                        onClick={onOpenTestEmail}
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: '#fff',
                          border: 'none',
                        }}
                        loading={sendingTest}
                      >
                        Send Test
                      </Button>
                      <Dropdown
                        droplist={
                          <Menu>
                            {versions.length === 0 && (
                              <Menu.Item key='no-versions' disabled>
                                No saved versions yet
                              </Menu.Item>
                            )}
                            {versions.map((v) => (
                              <Menu.Item
                                key={v.id}
                                onClick={() => onRestoreVersion(v)}
                              >
                                <div>
                                  <div style={{ fontWeight: 600 }}>{v.description}</div>
                                  <div style={{ fontSize: '11px', color: '#999' }}>
                                    {new Date(v.created_at).toLocaleString()}
                                  </div>
                                </div>
                              </Menu.Item>
                            ))}
                          </Menu>
                        }
                      >
                        <Button
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            color: '#fff',
                            border: 'none',
                          }}
                        >
                          <strong>History ({versions.length})</strong>
                        </Button>
                      </Dropdown>
                      <Dropdown
                        droplist={
                          <Menu>
                            <Menu.Item
                              key='Export MJML'
                              onClick={() => onExportMJML(values)}
                            >
                              Export MJML
                            </Menu.Item>
                            <Menu.Item
                              key='Export HTML'
                              onClick={() => onExportHTML(values)}
                            >
                              Export HTML
                            </Menu.Item>
                            <Menu.Item
                              key='Export JSON'
                              onClick={() => onExportJSON(values)}
                            >
                              Export JSON
                            </Menu.Item>
                          </Menu>
                        }
                      >
                        <Button
                          style={{
                            background: 'rgba(255,255,255,0.2)',
                            color: '#fff',
                            border: 'none',
                          }}
                        >
                          <strong>Export</strong>
                        </Button>
                      </Dropdown>
                    </Stack>
                  }
                />

                <SimpleLayout>
                  <EmailEditor />
                </SimpleLayout>

                <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Test Email</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                      <div className='space-y-2'>
                        <Label htmlFor='test-email'>Email Address</Label>
                        <Input
                          id='test-email'
                          type='email'
                          placeholder='you@peachpayments.com'
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && onSendTestEmail(values)}
                        />
                      </div>
                      {testEmailError && (
                        <p className='text-sm text-red-600 bg-red-50 p-3 rounded-md'>
                          {testEmailError}
                        </p>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <button className='px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-100'>Cancel</button>
                      </DialogClose>
                      <button
                        onClick={() => onSendTestEmail(values)}
                        disabled={!testEmail.trim() || sendingTest}
                        className='px-4 py-2 rounded-md bg-[#ec5228] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50'
                      >
                        {sendingTest ? 'Sending...' : 'Send'}
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={compOpen} onOpenChange={setCompOpen}>
                  <DialogContent className='max-w-2xl max-h-[80vh] overflow-y-auto'>
                    <DialogHeader>
                      <DialogTitle>Save Section as Component</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                      <div className='space-y-2'>
                        <Label>Select Section</Label>
                        <div className='grid grid-cols-2 gap-3'>
                          {sections.map((section: any, i: number) => {
                            const html = renderSectionHtml(section, values.content);
                            return (
                              <div
                                key={i}
                                onClick={() => setCompSectionIdx(i)}
                                className={`cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                                  compSectionIdx === i
                                    ? 'border-[#ec5228] ring-2 ring-[#ec5228]/20'
                                    : 'border-gray-200 hover:border-gray-400'
                                }`}
                              >
                                <div className='bg-white' style={{ height: 120, overflow: 'hidden' }}>
                                  {html ? (
                                    <iframe
                                      srcDoc={html}
                                      style={{
                                        width: '600px',
                                        height: '500px',
                                        transform: 'scale(0.38)',
                                        transformOrigin: 'top left',
                                        border: 'none',
                                        pointerEvents: 'none',
                                      }}
                                      sandbox=''
                                    />
                                  ) : (
                                    <div className='w-full h-full flex items-center justify-center text-gray-400 text-xs'>
                                      Preview unavailable
                                    </div>
                                  )}
                                </div>
                                <div className='px-3 py-2 bg-gray-50 border-t text-xs font-medium text-gray-700 truncate'>
                                  {i + 1}. {getSectionLabel(section, i)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                          <Label htmlFor='comp-name'>Component Name</Label>
                          <Input
                            id='comp-name'
                            placeholder='e.g. Peach Header, CTA Banner'
                            value={compName}
                            onChange={(e) => setCompName(e.target.value)}
                          />
                        </div>
                        <div className='space-y-2'>
                          <Label htmlFor='comp-cat'>Category</Label>
                          <Input
                            id='comp-cat'
                            placeholder='e.g. Header, Footer, CTA, Body'
                            value={compCategory}
                            onChange={(e) => setCompCategory(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <button className='px-4 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-100'>Cancel</button>
                      </DialogClose>
                      <button
                        onClick={() => onSaveAsComponent(values)}
                        disabled={!compName.trim() || savingComponent}
                        className='px-4 py-2 rounded-md bg-[#ec5228] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50'
                      >
                        {savingComponent ? 'Saving...' : 'Save Component'}
                      </button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            );
          }}
        </EmailEditorProvider>
      </div>
    </ConfigProvider>
  );
}
