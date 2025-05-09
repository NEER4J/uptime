'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Trash2, Plus, Phone, Mail, AlertTriangle, Send, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NotificationsPage() {
  const [emailRecipients, setEmailRecipients] = useState<any[]>([]);
  const [phoneRecipients, setPhoneRecipients] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Test notification state
  const [domains, setDomains] = useState<any[]>([]);
  const [testDomain, setTestDomain] = useState('');
  const [testType, setTestType] = useState('downtime');
  const [testDaysRemaining, setTestDaysRemaining] = useState('30');
  const [testMessage, setTestMessage] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  
  // SMS Configuration testing
  const [twilioStatus, setTwilioStatus] = useState<any>(null);
  const [twilioTesting, setTwilioTesting] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  
  const supabase = createClient();
  
  useEffect(() => {
    fetchNotificationSettings();
    fetchDomains();
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
  
  async function testTwilioConfig() {
    setTwilioTesting(true);
    setError('');
    setSuccess('');
    
    try {
      // Call a new API endpoint to test Twilio configuration directly
      const response = await fetch('/api/test-twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test Twilio configuration');
      }
      
      setTwilioStatus(data);
      
      if (data.success) {
        setSuccess(`Twilio configuration test successful! Account type: ${data.accountType}`);
      } else {
        setError(`Twilio configuration issue: ${data.message}`);
      }
    } catch (error: any) {
      setError(`Error testing Twilio configuration: ${error.message}`);
    } finally {
      setTwilioTesting(false);
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
    
    try {
      const response = await fetch('/api/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhone.trim() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test SMS');
      }
      
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
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Notification Settings</h1>
      <p className="text-muted-foreground mb-6">
        Configure email and SMS recipients for all alerts. Recipients will be notified about all issues including domain expiration, SSL certificate expiration, and downtime.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <Mail className="h-5 w-5 mr-2 text-blue-500" />
          <h2 className="text-xl font-semibold">Email Notifications</h2>
        </div>
        
        <div className="mb-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addEmailRecipient} disabled={!newEmail.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          {loading ? (
            <p className="text-gray-500">Loading email recipients...</p>
          ) : emailRecipients.length === 0 ? (
            <p className="text-gray-500 italic">No email recipients configured</p>
          ) : (
            emailRecipients.map(recipient => (
              <div key={recipient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>{recipient.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEmailRecipient(recipient.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <Phone className="h-5 w-5 mr-2 text-purple-500" />
          <h2 className="text-xl font-semibold">SMS Notifications</h2>
        </div>
        
        <div className="mb-4">
          <div className="flex gap-2">
            <Input
              type="tel"
              placeholder="Phone number (e.g. +1234567890)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addPhoneRecipient} disabled={!newPhone.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-muted-foreground">
              Enter phone numbers in international format (e.g., +1234567890)
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={testDirectSms}
                disabled={smsTesting || !newPhone.trim()}
              >
                {smsTesting ? 'Sending...' : 'Test SMS to This Number'}
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={testTwilioConfig}
                disabled={twilioTesting}
              >
                {twilioTesting ? 'Testing...' : 'Check Twilio Config'}
              </Button>
            </div>
          </div>
          
          {twilioStatus && (
            <div className={`mt-3 p-3 text-sm rounded ${twilioStatus.success ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              <p className="font-medium">Twilio Status:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Account SID: {twilioStatus.accountSid ? 'Configured' : 'Missing'}</li>
                <li>Auth Token: {twilioStatus.authToken ? 'Configured' : 'Missing'}</li>
                <li>Phone Number: {twilioStatus.phoneNumber || 'Missing'}</li>
                <li>Connectivity: {twilioStatus.connected ? 'Connected' : 'Failed to connect'}</li>
                {twilioStatus.error && <li>Error: {twilioStatus.error}</li>}
              </ul>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {loading ? (
            <p className="text-gray-500">Loading phone recipients...</p>
          ) : phoneRecipients.length === 0 ? (
            <p className="text-gray-500 italic">No phone recipients configured</p>
          ) : (
            phoneRecipients.map(recipient => (
              <div key={recipient.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>{recipient.phone_number}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePhoneRecipient(recipient.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <Send className="h-5 w-5 mr-2 text-green-500" />
          <h2 className="text-xl font-semibold">Test Notifications</h2>
        </div>
        
        <p className="text-muted-foreground mb-4">
          Send a test notification to verify your configuration is working correctly.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Domain</label>
            <select 
              value={testDomain} 
              onChange={(e) => setTestDomain(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {domains.map(domain => (
                <option key={domain.domain_name} value={domain.domain_name}>
                  {domain.display_name || domain.domain_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Notification Type</label>
            <select 
              value={testType} 
              onChange={(e) => setTestType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="downtime">Downtime Alert</option>
              <option value="ssl-expiry">SSL Expiry Alert</option>
              <option value="domain-expiry">Domain Expiry Alert</option>
              <option value="ip-change">IP Change Alert</option>
            </select>
          </div>
          
          {(testType === 'ssl-expiry' || testType === 'domain-expiry') && (
            <div>
              <label className="block text-sm font-medium mb-2">Days Remaining</label>
              <Input
                type="number"
                min="1"
                max="365"
                value={testDaysRemaining}
                onChange={(e) => setTestDaysRemaining(e.target.value)}
              />
            </div>
          )}
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2">
              Custom Message (Optional)
            </label>
            <div className="flex items-center gap-2 mb-2">
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
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default message for the selected notification type
            </p>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button 
            onClick={testNotification} 
            disabled={testLoading || (!emailRecipients.length && !phoneRecipients.length) || !testDomain}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {testLoading ? 'Sending...' : 'Send Test Notification'}
          </Button>
        </div>
        
        {(!emailRecipients.length && !phoneRecipients.length) && (
          <p className="text-amber-600 mt-4 text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-1" />
            You don't have any notification recipients configured yet. Add at least one email or phone number above.
          </p>
        )}
      </div>
    </div>
  );
} 