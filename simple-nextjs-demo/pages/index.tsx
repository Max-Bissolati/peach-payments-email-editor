'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getTemplates, createTemplate, deleteTemplate, Template } from '@/lib/templates';
import { defaultTemplateContent } from '@/lib/default-template';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Mail,
  Pencil,
  LogOut,
  User,
  Plus,
  Trash2,
  Copy,
  Loader2,
  Puzzle,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import starterTemplate from '@/data/template1.json';
import dynamic from 'next/dynamic';

const TemplatePreview = dynamic(() => import('@/components/template-preview'), {
  ssr: false,
  loading: () => (
    <div className='w-full h-full flex items-center justify-center'>
      <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300' />
    </div>
  ),
});

export default function Component() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadTemplates();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBlank = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createTemplate(newName.trim(), newCategory.trim() || 'General', defaultTemplateContent as unknown as Record<string, unknown>);
      await loadTemplates();
      setNewName('');
      setNewCategory('General');
      setDialogOpen(false);
    } catch (err) {
      console.error('Failed to create template:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleImportStarter = async () => {
    setCreating(true);
    try {
      const t = await createTemplate(
        'Yoyo Rewards Partner Launch',
        'Product Launch',
        starterTemplate.content as unknown as Record<string, unknown>,
        starterTemplate.thumbnail
      );
      await loadTemplates();
    } catch (err) {
      console.error('Failed to import starter:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      await createTemplate(`${template.name} (Copy)`, template.category, template.content, template.thumbnail || undefined);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    try {
      await deleteTemplate(id);
      await loadTemplates();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className='flex h-screen bg-gray-50'>
      <div className='w-64 bg-white border-r border-gray-200 flex flex-col'>
        <div className='p-6'>
          <h1 className='text-xl font-semibold text-gray-900 mb-6'>Peach Email Builder</h1>
          <div className='space-y-1'>
            <Link href='/'>
              <Button variant={pathname === '/' ? 'secondary' : 'ghost'} className={`w-full justify-start ${pathname === '/' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Mail className={`w-4 h-4 mr-3 ${pathname === '/' ? 'text-blue-700' : 'text-gray-500'}`} />
                All Templates
              </Button>
            </Link>
            <Link href='/components'>
              <Button variant={pathname === '/components' ? 'secondary' : 'ghost'} className={`w-full justify-start ${pathname === '/components' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Puzzle className={`w-4 h-4 mr-3 ${pathname === '/components' ? 'text-blue-700' : 'text-gray-500'}`} />
                Components
              </Button>
            </Link>
          </div>
        </div>
        <div className='mt-auto p-4 border-t border-gray-200'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-[#070a43] flex items-center justify-center'>
              <User className='w-4 h-4 text-white' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-gray-900 truncate'>
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </p>
              <p className='text-xs text-gray-500 truncate'>{user.email}</p>
            </div>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={signOut}>
              <LogOut className='w-4 h-4 text-gray-500' />
            </Button>
          </div>
        </div>
      </div>

      <div className='flex-1 flex flex-col'>
        <div className='flex items-center justify-between p-6 pb-0'>
          <div />
          <div className='flex gap-2'>
            <Button variant='outline' onClick={handleImportStarter} disabled={creating}>
              <Copy className='w-4 h-4 mr-2' />
              Import Starter Template
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className='w-4 h-4 mr-2' />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>Start with a blank email template.</DialogDescription>
                </DialogHeader>
                <div className='space-y-4 py-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='name'>Template Name</Label>
                    <Input
                      id='name'
                      placeholder='e.g. Monthly Newsletter'
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateBlank()}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='category'>Category</Label>
                    <Input
                      id='category'
                      placeholder='e.g. Newsletter, Product Launch'
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant='outline'>Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleCreateBlank} disabled={!newName.trim() || creating}>
                    {creating ? <Loader2 className='w-4 h-4 mr-2 animate-spin' /> : null}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className='flex-1 overflow-auto p-6'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
            </div>
          ) : templates.length === 0 ? (
            <div className='text-center py-12'>
              <Mail className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>No templates yet</h3>
              <p className='text-gray-500 mb-6'>Create a new template or import the starter template.</p>
              <div className='flex justify-center gap-3'>
                <Button variant='outline' onClick={handleImportStarter} disabled={creating}>
                  <Copy className='w-4 h-4 mr-2' />
                  Import Starter Template
                </Button>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className='w-4 h-4 mr-2' />
                  New Template
                </Button>
              </div>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {templates.map((template) => (
                <Card key={template.id} className='hover:shadow-lg transition-all duration-200 group'>
                  <CardHeader className='pb-3'>
                    <div className='bg-white rounded-md overflow-hidden border border-gray-100 mb-2'>
                      <TemplatePreview content={template.content} />
                    </div>
                    <div className='space-y-1'>
                      <h3 className='font-semibold text-gray-900'>{template.name}</h3>
                      <p className='text-xs text-gray-500'>{template.category}</p>
                    </div>
                  </CardHeader>
                  <CardContent className='pt-0 relative'>
                    <div className='flex items-center justify-between text-xs text-gray-500'>
                      <span>{new Date(template.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className='absolute bottom-4 right-4 flex gap-1'>
                      <Button
                        size='sm'
                        variant='secondary'
                        className='h-8 w-8 p-0'
                        onClick={() => handleDuplicate(template)}
                        title='Duplicate'
                      >
                        <Copy className='w-4 h-4' />
                      </Button>
                      <Button
                        size='sm'
                        variant='secondary'
                        className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                        onClick={() => handleDelete(template.id)}
                        title='Delete'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                      <Link href={`/editor?id=${template.id}`}>
                        <Button size='sm' variant='secondary' className='h-8 w-8 p-0' title='Edit'>
                          <Pencil className='w-4 h-4' />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
