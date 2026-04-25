'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getComponents, deleteComponent, Component } from '@/lib/components';
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
  LogOut,
  User,
  Plus,
  Trash2,
  Loader2,
  Puzzle,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

export default function ComponentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewComponent, setViewComponent] = useState<Component | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadComponents();
  }, [user]);

  const loadComponents = async () => {
    try {
      const data = await getComponents();
      setComponents(data);
    } catch (err) {
      console.error('Failed to load components:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this component?')) return;
    try {
      await deleteComponent(id);
      await loadComponents();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const copyJson = (component: Component) => {
    navigator.clipboard.writeText(JSON.stringify(component.content, null, 2));
    alert('Component JSON copied to clipboard!');
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
              <Button variant='ghost' className='w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-50'>
                <Mail className='w-4 h-4 mr-3 text-gray-500' />
                All Templates
              </Button>
            </Link>
            <Button variant='secondary' className='w-full justify-start bg-blue-50 text-blue-700 hover:bg-blue-100'>
              <Puzzle className='w-4 h-4 mr-3 text-blue-700' />
              Components
            </Button>
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
        <div className='flex items-center p-6 pb-0'>
          <Button variant='ghost' onClick={() => router.push('/')} className='mr-4'>
            <ArrowLeft className='w-4 h-4 mr-2' />
            Back to Templates
          </Button>
          <h2 className='text-lg font-semibold'>Saved Components</h2>
        </div>

        <div className='flex-1 overflow-auto p-6'>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
            </div>
          ) : components.length === 0 ? (
            <div className='text-center py-12'>
              <Puzzle className='w-12 h-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>No saved components</h3>
              <p className='text-gray-500'>Save reusable sections from the email editor. They'll appear here.</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
              {components.map((component) => (
                <Card key={component.id} className='hover:shadow-lg transition-all duration-200'>
                  <CardHeader className='pb-3'>
                    <div className='space-y-1'>
                      <h3 className='font-semibold text-gray-900'>{component.name}</h3>
                      <p className='text-xs text-gray-500'>{component.category}</p>
                    </div>
                  </CardHeader>
                  <CardContent className='pt-0'>
                    <div className='flex items-center justify-between text-xs text-gray-500 mb-3'>
                      <span>{new Date(component.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className='flex gap-2'>
                      <Button size='sm' variant='outline' onClick={() => copyJson(component)} className='flex-1'>
                        Copy JSON
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='text-red-600 hover:text-red-700 hover:bg-red-50'
                        onClick={() => handleDelete(component.id)}
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
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
