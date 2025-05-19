'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, Plus, Phone, Mail, AlertTriangle, Send, ArrowRight, CheckCircle, XCircle, Settings, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export default function NotificationsPage() {
  const [emailRecipients, setEmailRecipients] = useState<any[]>([]);
  const [phoneRecipients, setPhoneRecipients] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  
  // Test notification state
  const [domains, setDomains] = useState<any[]>([]);
  const [testDomain, setTestDomain] = useState('');
  const [testType, setTestType] = useState('downtime');
  const [testDaysRemaining, setTestDaysRemaining] = useState('30');
  const [testMessage, setTestMessage] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  
  // SMS Configuration testing
  const [smsTestResponse, setSmsTestResponse] = useState<any>(null);
  const [smsTesting, setSmsTesting] = useState(false);
  
  const supabase = createClient();
  
  useEffect(() => {
    fetchNotificationSettings();
    fetchDomains();
    fetchNotificationPreferences();
  }, []);
  
  async function fetchNotificationSettings() {
    setLoading(true);
    
    // Fetch email recipients
    const { data: emailData, error: emailError } = await supabase
      .from('notification_emails')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (emailError) {
      console.error('Error fetching email settings:', emailError);
      setError('Failed to load email settings');
    } else {
      setEmailRecipients(emailData || []);
    }
    
    // Fetch phone recipients
    const { data: phoneData, error: phoneError } = await supabase
      .from('notification_phones')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (phoneError) {
      console.error('Error fetching phone settings:', phoneError);
      setError('Failed to load phone settings');
    } else {
      setPhoneRecipients(phoneData || []);
    }
    
    setLoading(false);
  }
  
  async function fetchDomains() {
    const { data, error } = await supabase
      .from('domains')
      .select('domain_name, display_name')
      .order('display_name', { ascending: true });
    
    if (error) {
      console.error('Error fetching domains:', error);
    } else if (data && data.length > 0) {
      setDomains(data);
      setTestDomain(data[0].domain_name);
    }
  }
  
  async function fetchNotificationPreferences() {
    try {
      const response = await fetch('/api/notification-preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }
      
      const data = await response.json();
      setEmailEnabled(data.email_enabled);
      setSmsEnabled(data.sms_enabled);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  }
  
  async function toggleEmailNotifications(enabled: boolean) {
    setPreferencesLoading(true);
    setEmailEnabled(enabled);
    
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_enabled: enabled })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update email preferences');
      }
      
      setSuccess(`Email notifications ${enabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(`Error updating email preferences: ${error.message}`);
      setTimeout(() => setError(''), 3000);
      setEmailEnabled(!enabled); // Revert UI state if update failed
    } finally {
      setPreferencesLoading(false);
    }
  }
  
  async function toggleSmsNotifications(enabled: boolean) {
    setPreferencesLoading(true);
    setSmsEnabled(enabled);
    
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sms_enabled: enabled })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update SMS preferences');
      }
      
      setSuccess(`SMS notifications ${enabled ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(`Error updating SMS preferences: ${error.message}`);
      setTimeout(() => setError(''), 3000);
      setSmsEnabled(!enabled); // Revert UI state if update failed
    } finally {
      setPreferencesLoading(false);
    }
  }
  
  async function addEmailRecipient() {
    if (!newEmail.trim()) return;
    
    const { data, error } = await supabase
      .from('notification_emails')
      .insert({
        email: newEmail.trim(),
      })
      .select();
    
    if (error) {
      console.error('Error adding email recipient:', error);
      setError('Failed to add email recipient');
    } else {
      setSuccess('Email recipient added successfully');
      setEmailRecipients([...emailRecipients, ...data]);
      setNewEmail('');
      setTimeout(() => setSuccess(''), 3000);
    }
  }
  
  async function removeEmailRecipient(id: string) {
    const { error } = await supabase
      .from('notification_emails')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error removing email recipient:', error);
      setError('Failed to remove email recipient');
    } else {
      setSuccess('Email recipient removed successfully');
      setEmailRecipients(emailRecipients.filter(r => r.id !== id));
      setTimeout(() => setSuccess(''), 3000);
    }
  }
  
  async function addPhoneRecipient() {
    if (!newPhone.trim()) return;
    
    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(newPhone.trim())) {
      setError("Phone number must be in international format (e.g., +1234567890)");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    const { data, error } = await supabase
      .from('notification_phones')
      .insert({
        phone_number: newPhone.trim()
      })
      .select();
    
    if (error) {
      console.error('Error adding phone recipient:', error);
      setError('Failed to add phone recipient');
    } else {
      setSuccess('Phone recipient added successfully');
      setPhoneRecipients([...phoneRecipients, ...data]);
      setNewPhone('');
      setTimeout(() => setSuccess(''), 3000);
    }
  }
  
  async function removePhoneRecipient(id: string) {
    const { error } = await supabase
      .from('notification_phones')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error removing phone recipient:', error);
      setError('Failed to remove phone recipient');
    } else {
      setSuccess('Phone recipient removed successfully');
      setPhoneRecipients(phoneRecipients.filter(r => r.id !== id));
      setTimeout(() => setSuccess(''), 3000);
    }
  }
  
  async function testNotification() {
    if (!testDomain) {
      setError('Please select a domain for testing');
      return;
    }
    
    setTestLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/test-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: testType,
          domain: testDomain,
          daysRemaining: testType === 'downtime' ? undefined : parseInt(testDaysRemaining),
          message: testMessage || undefined
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test notification');
      }
      
      setSuccess(`Test notification sent successfully to ${data.recipients.emails.length} email(s) and ${data.recipients.phones.length} phone number(s)`);
    } catch (error: any) {
      setError(`Error sending test notification: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  }
  
  async function testDirectSms() {
    if (!newPhone.trim()) {
      setError("Please enter a phone number to test");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(newPhone.trim())) {
      setError("Phone number must be in international format (e.g., +1234567890)");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    setSmsTesting(true);
    setError('');
    setSuccess('');
    setSmsTestResponse(null);
    
    try {
      const response = await fetch('/api/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhone.trim() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setSmsTestResponse({
          success: false,
          error: data.error || data.errorDetails || 'Failed to send test SMS'
        });
        throw new Error(data.error || 'Failed to send test SMS');
      }
      
      setSmsTestResponse({
        success: true,
        response: data.response
      });
      setSuccess(`Test SMS sent successfully to ${newPhone}`);
    } catch (error: any) {
      setError(`Error sending test SMS: ${error.message}`);
    } finally {
      setSmsTesting(false);
    }
  }
  
  // Generate default message based on selected type and domain
  const generateDefaultMessage = () => {
    const domainInfo = domains.find(d => d.domain_name === testDomain);
    const domainName = domainInfo?.display_name || testDomain;
    
    switch (testType) {
      case 'downtime':
        return `${domainName} is currently DOWN. This is a test notification.`;
      case 'ssl-expiry':
        return `SSL certificate for ${domainName} is expiring in ${testDaysRemaining} days. This is a test notification.`;
      case 'domain-expiry':
        return `Domain ${domainName} is expiring in ${testDaysRemaining} days. This is a test notification.`;
      case 'ip-change':
        return `IP address change detected for ${domainName}. This is a test notification.`;
      default:
        return '';
    }
  };
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <Badge variant="outline" className="text-xs font-normal px-2 py-1 bg-primary/10">
          <Settings className="h-3 w-3 mr-1" />
          System Alerts
        </Badge>
      </div>
      
      <p className="text-muted-foreground mb-6">
        Configure recipients for system alerts including domain expirations, SSL certificate expirations, and downtime notifications.
      </p>
      
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-md px-4 py-3 mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 mb-6 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <CardTitle>Notification Channels</CardTitle>
          </div>
          <CardDescription>
            Enable or disable notification channels
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {emailEnabled ? 'Enabled' : 'Disabled'} • {emailRecipients.length} recipient{emailRecipients.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Switch
                checked={emailEnabled}
                onCheckedChange={toggleEmailNotifications}
                disabled={preferencesLoading}
                aria-label="Toggle email notifications"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    {smsEnabled ? 'Enabled' : 'Disabled'} • {phoneRecipients.length} recipient{phoneRecipients.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Switch
                checked={smsEnabled}
                onCheckedChange={toggleSmsNotifications}
                disabled={preferencesLoading}
                aria-label="Toggle SMS notifications"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="recipients" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="recipients">Recipients</TabsTrigger>
          <TabsTrigger value="test">Test Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recipients">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Recipients */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <CardTitle>Email Notifications</CardTitle>
                </div>
                <CardDescription>
                  Recipients will receive email alerts for all monitored events
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addEmailRecipient} disabled={!newEmail.trim()} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="text-sm text-muted-foreground animate-pulse">Loading...</div>
                  ) : emailRecipients.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">No email recipients configured</div>
                  ) : (
                    emailRecipients.map(recipient => (
                      <div key={recipient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100">
                        <span className="text-sm truncate mr-2">{recipient.email}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEmailRecipient(recipient.id)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 text-xs text-muted-foreground">
                {emailRecipients.length === 0 ? 
                  <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" /> : 
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />}
                {emailRecipients.length} email recipient{emailRecipients.length !== 1 ? 's' : ''} configured
              </CardFooter>
            </Card>
            
            {/* SMS Recipients */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-purple-500" />
                  <CardTitle>SMS Notifications</CardTitle>
                </div>
                <CardDescription>
                  Recipients will receive SMS alerts for all monitored events
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="tel"
                    placeholder="Phone number (e.g. +1234567890)"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addPhoneRecipient} disabled={!newPhone.trim()} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
                
                <div className="flex items-center justify-between gap-2 mb-4">
                  <p className="text-xs text-muted-foreground">
                    Enter phone numbers in international format
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={testDirectSms}
                      disabled={smsTesting || !newPhone.trim()}
                      className="h-7 text-xs flex items-center"
                    >
                      {smsTesting ? 
                        <span className="flex items-center">Sending... <span className="animate-pulse ml-1">●</span></span> : 
                        <span className="flex items-center">Test SMS <Send className="h-3.5 w-3.5 ml-1" /></span>
                      }
                    </Button>
                  </div>
                </div>
                
                {smsTestResponse && (
                  <div className={`mb-4 p-3 text-xs rounded-md ${smsTestResponse.success ? 'bg-green-50 border border-green-100 text-green-700' : 'bg-amber-50 border border-amber-100 text-amber-700'}`}>
                    <p className="font-medium mb-1">SMS Test Response:</p>
                    <pre className="whitespace-pre-wrap overflow-x-auto text-xs">{JSON.stringify(smsTestResponse.response || smsTestResponse.error, null, 2)}</pre>
                  </div>
                )}
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="text-sm text-muted-foreground animate-pulse">Loading...</div>
                  ) : phoneRecipients.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">No phone recipients configured</div>
                  ) : (
                    phoneRecipients.map(recipient => (
                      <div key={recipient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-100">
                        <span className="text-sm truncate mr-2">{recipient.phone_number}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhoneRecipient(recipient.id)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 text-xs text-muted-foreground">
                {phoneRecipients.length === 0 ? 
                  <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" /> : 
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />}
                {phoneRecipients.length} phone recipient{phoneRecipients.length !== 1 ? 's' : ''} configured
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-green-500" />
                <CardTitle>Test Notifications</CardTitle>
              </div>
              <CardDescription>
                Send a test notification to verify your configuration is working correctly
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Domain</label>
                  <Select value={testDomain} onValueChange={setTestDomain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map(domain => (
                        <SelectItem key={domain.domain_name} value={domain.domain_name}>
                          {domain.display_name || domain.domain_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notification Type</label>
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="downtime">Downtime Alert</SelectItem>
                      <SelectItem value="ssl-expiry">SSL Expiry Alert</SelectItem>
                      <SelectItem value="domain-expiry">Domain Expiry Alert</SelectItem>
                      <SelectItem value="ip-change">IP Change Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {(testType === 'ssl-expiry' || testType === 'domain-expiry') && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Days Remaining</label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={testDaysRemaining}
                      onChange={(e) => setTestDaysRemaining(e.target.value)}
                    />
                  </div>
                )}
                
                <div className={testType === 'ssl-expiry' || testType === 'domain-expiry' ? 'md:col-span-1' : 'md:col-span-2'}>
                  <label className="block text-sm font-medium mb-1.5">
                    Custom Message (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={generateDefaultMessage()}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setTestMessage(generateDefaultMessage())}
                      title="Use default message"
                      className="flex-shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Leave blank to use the default message for the selected notification type
                  </p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between items-center">
              {(!emailRecipients.length && !phoneRecipients.length) && (
                <p className="text-amber-600 text-sm flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Add at least one recipient above before testing
                </p>
              )}
              <div className="ml-auto">
                <Button 
                  onClick={testNotification} 
                  disabled={testLoading || (!emailRecipients.length && !phoneRecipients.length) || !testDomain}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {testLoading ? 'Sending...' : 'Send Test Notification'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>All notifications will be sent to these recipients when alerts are triggered for any domain.</p>
      </div>
    </div>
  );
} 