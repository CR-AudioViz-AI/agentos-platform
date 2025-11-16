'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Settings, Save, ArrowLeft, Shield, Bell, Mail, Database,
  Palette, Globe, Lock, Key, Users, Home, DollarSign,
  AlertCircle, CheckCircle, Code, Server
} from 'lucide-react';

interface PlatformSettings {
  site_name: string;
  site_description: string;
  support_email: string;
  admin_email: string;
  allow_new_registrations: boolean;
  require_email_verification: boolean;
  enable_oauth_google: boolean;
  enable_agent_applications: boolean;
  max_properties_per_agent: number;
  commission_rate: number;
  maintenance_mode: boolean;
}

export default function AdminSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'email' | 'features' | 'api'>('general');
  
  const [settings, setSettings] = useState<PlatformSettings>({
    site_name: 'AgentOS',
    site_description: 'AI-Powered Real Estate Platform',
    support_email: 'support@agentos.com',
    admin_email: 'admin@agentos.com',
    allow_new_registrations: true,
    require_email_verification: true,
    enable_oauth_google: true,
    enable_agent_applications: true,
    max_properties_per_agent: 100,
    commission_rate: 2.5,
    maintenance_mode: false,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/customer/dashboard');
        return;
      }

      // Load settings from database
      // TODO: Implement settings table and load actual values
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/login');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // TODO: Save settings to database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
                <p className="text-sm text-gray-600 mt-1">Configure your AgentOS platform</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      {/* Message Banner */}
      {message && (
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6`}>
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="font-medium">{message.text}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-3">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 space-y-1">
              {[
                { id: 'general', label: 'General', icon: Settings },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'features', label: 'Features', icon: Code },
                { id: 'api', label: 'API & Integrations', icon: Server },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Settings Content */}
          <div className="col-span-9 space-y-6">
            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">General Settings</h2>
                  <p className="text-sm text-gray-600 mt-1">Basic platform configuration</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={settings.site_name}
                      onChange={(e) => updateSetting('site_name', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Description
                    </label>
                    <textarea
                      value={settings.site_description}
                      onChange={(e) => updateSetting('site_description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.support_email}
                      onChange={(e) => updateSetting('support_email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      value={settings.admin_email}
                      onChange={(e) => updateSetting('admin_email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                  <p className="text-sm text-gray-600 mt-1">Authentication and access control</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Allow New Registrations</p>
                      <p className="text-sm text-gray-600">Enable new users to sign up for accounts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.allow_new_registrations}
                        onChange={(e) => updateSetting('allow_new_registrations', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Require Email Verification</p>
                      <p className="text-sm text-gray-600">Users must verify their email to access the platform</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.require_email_verification}
                        onChange={(e) => updateSetting('require_email_verification', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Enable Google OAuth</p>
                      <p className="text-sm text-gray-600">Allow users to sign in with Google</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enable_oauth_google}
                        onChange={(e) => updateSetting('enable_oauth_google', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                    <div>
                      <p className="font-medium text-red-900">Maintenance Mode</p>
                      <p className="text-sm text-red-700">Disable public access to the platform</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.maintenance_mode}
                        onChange={(e) => updateSetting('maintenance_mode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Email Settings */}
            {activeSection === 'email' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Email Configuration</h2>
                  <p className="text-sm text-gray-600 mt-1">Email service settings and templates</p>
                </div>
                <div className="p-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Email Configuration</h3>
                    <p className="text-gray-600">Email service integration coming soon</p>
                  </div>
                </div>
              </div>
            )}

            {/* Features Settings */}
            {activeSection === 'features' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Feature Settings</h2>
                  <p className="text-sm text-gray-600 mt-1">Enable or disable platform features</p>
                </div>
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Agent Applications</p>
                      <p className="text-sm text-gray-600">Allow users to apply to become agents</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enable_agent_applications}
                        onChange={(e) => updateSetting('enable_agent_applications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Properties Per Agent
                    </label>
                    <input
                      type="number"
                      value={settings.max_properties_per_agent}
                      onChange={(e) => updateSetting('max_properties_per_agent', parseInt(e.target.value))}
                      min="1"
                      max="1000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">Maximum number of properties an agent can list</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      value={settings.commission_rate}
                      onChange={(e) => updateSetting('commission_rate', parseFloat(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-sm text-gray-500">Default commission rate for transactions</p>
                  </div>
                </div>
              </div>
            )}

            {/* API Settings */}
            {activeSection === 'api' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">API & Integrations</h2>
                  <p className="text-sm text-gray-600 mt-1">Third-party service integrations</p>
                </div>
                <div className="p-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                    <Server className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">API Configuration</h3>
                    <p className="text-gray-600">API keys and integration settings coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
