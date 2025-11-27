-- Create business_contacts table for storing contact information for businesses
-- Each contact belongs to a business and contains name, email, phone, and role
CREATE TABLE business_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone_no TEXT,
  role TEXT,
  business_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_business_contacts_business_id ON business_contacts(business_id);
CREATE INDEX idx_business_contacts_email ON business_contacts(email);

-- Enable Row Level Security
ALTER TABLE business_contacts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view business contacts
CREATE POLICY "Anyone can view business contacts" ON business_contacts
  FOR SELECT USING (true);

-- Policy: Authenticated users can insert business contacts
CREATE POLICY "Authenticated users can insert business contacts" ON business_contacts
  FOR INSERT WITH CHECK (true);

-- Policy: Authenticated users can update business contacts
CREATE POLICY "Authenticated users can update business contacts" ON business_contacts
  FOR UPDATE USING (true);

-- Policy: Authenticated users can delete business contacts
CREATE POLICY "Authenticated users can delete business contacts" ON business_contacts
  FOR DELETE USING (true);
