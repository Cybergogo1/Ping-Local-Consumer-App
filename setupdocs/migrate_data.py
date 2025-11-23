#!/usr/bin/env python3
"""
Ping Local - CSV to Supabase Migration Script

This script imports your Adalo CSV exports into Supabase.

Prerequisites:
1. pip install supabase python-dotenv
2. Create a .env file with:
   SUPABASE_URL=https://pyufvauhjqfffezptuxl.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key
3. Place all CSV files in the same directory as this script

Usage:
python migrate_data.py
"""

import csv
import json
import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def parse_json_field(value):
    """Parse JSON fields that Adalo stores as strings"""
    if not value or value == '':
        return None
    try:
        # Remove any extra quotes and parse
        cleaned = value.strip().strip('"').strip("'")
        return json.loads(cleaned)
    except:
        return None

def parse_boolean(value):
    """Convert Adalo boolean strings to Python booleans"""
    if value in ['TRUE', 'True', 'true', '1']:
        return True
    elif value in ['FALSE', 'False', 'false', '0', '']:
        return False
    return None

def parse_timestamp(value):
    """Parse Adalo timestamp format"""
    if not value or value == '':
        return None
    try:
        # Adalo format: 2025-11-18T16:15:25.000Z
        return value
    except:
        return None

def parse_number(value):
    """Parse numeric fields"""
    if not value or value == '':
        return None
    try:
        if '.' in value:
            return float(value)
        return int(value)
    except:
        return None

def parse_array(value):
    """Parse array fields"""
    if not value or value == '':
        return []
    # Adalo might store arrays as comma-separated or JSON
    try:
        return json.loads(value)
    except:
        return [item.strip() for item in value.split(',') if item.strip()]

print("🚀 Starting Ping Local Data Migration...\n")

# ============================================================================
# 1. MIGRATE LOCATION AREAS
# ============================================================================
print("📍 Migrating Location Areas...")
try:
    with open('Location_Area (1).csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        location_areas = []
        
        for row in reader:
            location_area = {
                'id': parse_number(row['ID']),
                'name': row['Name'],
                'featured_image': parse_json_field(row['Featured Image']),
                'description': row['Description'] or None,
                'location': row['Location'] or None,
                'map_location': row['MapLocation'] or None,
                'created': parse_timestamp(row['Created']),
                'updated': parse_timestamp(row['Updated'])
            }
            location_areas.append(location_area)
        
        if location_areas:
            result = supabase.table('location_areas').insert(location_areas).execute()
            print(f"   ✅ Imported {len(location_areas)} location areas")
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 2. MIGRATE TAGS
# ============================================================================
print("🏷️  Migrating Tags...")
try:
    with open('Tags (2).csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        tags = []
        
        for row in reader:
            tag = {
                'id': parse_number(row['ID']),
                'name': row['Name'],
                'type': row['Type'],
                'created': parse_timestamp(row['Created']),
                'updated': parse_timestamp(row['Updated'])
            }
            tags.append(tag)
        
        if tags:
            result = supabase.table('tags').insert(tags).execute()
            print(f"   ✅ Imported {len(tags)} tags")
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 3. MIGRATE USERS
# ============================================================================
print("👥 Migrating Users...")
try:
    with open('Users (1).csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        users = []
        
        for row in reader:
            user = {
                'id': parse_number(row['ID']),
                'email': row['Email'],
                'first_name': row['First Name'],
                'surname': row['Surname'],
                'password': row['Password'],  # Keep bcrypt hash
                'phone_no': row['Phone No'] or None,
                'profile_pic': parse_json_field(row['Profile Pic']),
                'loyalty_points': parse_number(row['LoyaltyPoints']) or 0,
                'is_admin': parse_boolean(row['IsAdmin?']),
                'is_business': parse_boolean(row['Is Business?']),
                'is_test': parse_boolean(row['Is Test']),
                'viewing_date': parse_timestamp(row['Viewing Date']),
                'last_notify_clear': parse_timestamp(row['Last Notify Clear']),
                'business': row['Business'] or None,
                'activate_notifications': parse_boolean(row['Activate Notifications']),
                'favourite_business': row['Favourite Business'] or None,
                'verification_code': row['Verification Code'] or None,
                'verified': parse_boolean(row['Verified?']),
                'api_requires_sync': parse_boolean(row['APIRequiresSync']),
                'api_last_sync_date': parse_timestamp(row['APILastSyncDate']),
                'loyalty_tier': row['LoyaltyTier'] or 'Ping Local Member',
                'selected_location': row['SelectedLocation'] or None,
                'selected_location_id': parse_number(row['SelectedLocationID']),
                'selected_tags': parse_array(row.get('SelectedTags?', '')),
                'created': parse_timestamp(row['Created']),
                'updated': parse_timestamp(row['Updated'])
            }
            users.append(user)
        
        if users:
            # Insert in batches of 50 to avoid timeout
            batch_size = 50
            for i in range(0, len(users), batch_size):
                batch = users[i:i + batch_size]
                result = supabase.table('users').insert(batch).execute()
                print(f"   ✅ Imported users {i+1}-{min(i+batch_size, len(users))}")
            print(f"   ✅ Total: {len(users)} users imported")
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 4. MIGRATE BUSINESSES
# ============================================================================
print("🏢 Migrating Businesses...")
try:
    with open('Businesses (1).csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        businesses = []
        
        for row in reader:
            business = {
                'id': parse_number(row['ID']),
                'name': row['Name'],
                'featured_image': parse_json_field(row['Featured Image']),
                'email': row['Email'] or None,
                'description': row['Description'] or None,
                'description_summary': row['DescriptionSummary'] or None,
                'location': row['Location'] or None,
                'phone_number': row['Phone Number'] or None,
                'opening_times': row['Opening Times'] or None,
                'available_promotion_types': row['AvailablePromotionTypes'] or None,
                'is_featured': parse_boolean(row['IsFeatured?']),
                'is_signed_off': parse_boolean(row['IsSignedOff?']),
                'location_area': row['Location Area'] or None,
                'primary_user': row['Primary User'] or None,
                'owner_id': parse_number(row['OwnerID']),
                'category': row['Category'] or None,
                'sub_categories': row['Sub Categories'] or None,
                'stripe_account_no': row['Stripe Account No.'] or None,
                'lead_rate': parse_number(row['LeadRate']),
                'cut_percent': parse_number(row['CutPercent']),
                'api_requires_sync': parse_boolean(row['APIRequiresSync']),
                'api_last_sync_date': parse_timestamp(row['APILastSyncDate']),
                'currently_trading': parse_boolean(row['Currently Trading']),
                'created': parse_timestamp(row['Created']),
                'updated': parse_timestamp(row['Updated'])
            }
            businesses.append(business)
        
        if businesses:
            batch_size = 50
            for i in range(0, len(businesses), batch_size):
                batch = businesses[i:i + batch_size]
                result = supabase.table('businesses').insert(batch).execute()
                print(f"   ✅ Imported businesses {i+1}-{min(i+batch_size, len(businesses))}")
            print(f"   ✅ Total: {len(businesses)} businesses imported")
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 5. MIGRATE OFFERS
# ============================================================================
print("🎁 Migrating Offers...")
try:
    with open('Offers (2).csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        offers = []
        
        for row in reader:
            offer = {
                'id': parse_number(row['ID']),
                'name': row['Name'],
                'summary': row['Summary'] or None,
                'full_description': row['Full Description'] or None,
                'special_notes': row['Special Notes'] or None,
                'offer_type': row['Offer Type'] or None,
                'requires_booking': parse_boolean(row['Requires Booking']),
                'booking_type': row['Booking Type'] or None,
                'one_per_customer': parse_boolean(row['1perCustomer?']),
                'price_discount': parse_number(row['Price / Discount']),
                'unit_of_measurement': row['Unit of Measurement'] or None,
                'quantity': parse_number(row['Quantity']),
                'number_sold': parse_number(row['Number Sold']) or 0,
                'quantity_item': parse_boolean(row['Quantity Item?']),
                'status': row['Status'] or None,
                'finish_time': parse_timestamp(row['FinishTime']),
                'booking_url': row['BookingURL'] or None,
                'business_name': row['Business'] or None,  # Denormalized
                'featured_image': parse_json_field(row['Featured Image']),
                'category': row['Category'] or None,
                'customer_bill_input': parse_boolean(row['Customer Bill Input']),
                'start_date': parse_timestamp(row['Start Date']),
                'end_date': parse_timestamp(row['End Date']),
                'created_by_id': parse_number(row['CreatedbyID']),
                'created_by_name': row['CreatedbyName'] or None,
                'signed_off_by_name': row['SignedOffByName'] or None,
                'signed_off_by_id': parse_number(row['SignedOffByID']),
                'rejection_reason': row['RejectionReason'] or None,
                'business_policy': row['Business Policy'] or None,
                'policy_notes': row['PolicyNotes'] or None,
                'pricing_complete': parse_boolean(row['PricingComplete?']),
                'api_requires_sync': parse_boolean(row['APIRequiresSync']),
                'api_last_sync_date': parse_timestamp(row['APILastSyncDate']),
                'business_location': row['Business Location'] or None,
                'location_area': row['Location Area'] or None,
                'change_button_text': row['Change Button Text'] or None,
                'custom_feed_text': row['CustomFeedText'] or None,
                'created': parse_timestamp(row['Created']),
                'updated': parse_timestamp(row['Updated'])
            }
            
            # Link to business_id by matching business name
            # This is a simplified version - you may need to improve matching
            if offer['business_name']:
                try:
                    biz = supabase.table('businesses').select('id').eq('name', offer['business_name']).limit(1).execute()
                    if biz.data and len(biz.data) > 0:
                        offer['business_id'] = biz.data[0]['id']
                except:
                    pass
            
            offers.append(offer)
        
        if offers:
            batch_size = 50
            for i in range(0, len(offers), batch_size):
                batch = offers[i:i + batch_size]
                result = supabase.table('offers').insert(batch).execute()
                print(f"   ✅ Imported offers {i+1}-{min(i+batch_size, len(offers))}")
            print(f"   ✅ Total: {len(offers)} offers imported")
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 6. MIGRATE LOYALTY POINTS
# ============================================================================
print("⭐ Migrating Loyalty Points...")
try:
    with open('LoyaltyPoints.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        loyalty_points = []
        
        for row in reader:
            lp = {
                'id': parse_number(row['ID']),
                'name': row['Name'] or None,
                'amount': parse_number(row['Amount']),
                'user_id': parse_number(row['UserID']),
                'reason': row['Reason'] or None,
                'date_received': parse_timestamp(row['DateReceived']),
                'created': parse_timestamp(row['Created']),
                'updated': parse_timestamp(row['Updated'])
            }
            loyalty_points.append(lp)
        
        if loyalty_points:
            batch_size = 50
            for i in range(0, len(loyalty_points), batch_size):
                batch = loyalty_points[i:i + batch_size]
                result = supabase.table('loyalty_points').insert(batch).execute()
                print(f"   ✅ Imported loyalty points {i+1}-{min(i+batch_size, len(loyalty_points))}")
            print(f"   ✅ Total: {len(loyalty_points)} loyalty point records imported")
except Exception as e:
    print(f"   ❌ Error: {e}")

# ============================================================================
# 7. MIGRATE NOTIFICATIONS
# ============================================================================
print("🔔 Migrating Notifications...")
try:
    with open('Notifications.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        notifications = []
        
        for row in reader:
            notif = {
                'id': parse_number(row['ID']),
                'name': row['Name'] or None,
                'content': row['Content'] or None,
                'read': parse_boolean(row['Read?']),
                'trigger_user_id': parse_number(row['TriggerUserID']),
                'receiver_id': parse_number(row['RecieverID']),  # Note: Adalo typo "Reciever"
                'offer_id': parse_number(row['OfferID']),
                'notifications_categories': row['Notifications Categories'] or None,
                'created': parse_timestamp(row['Created']),
                'updated': parse_timestamp(row['Updated'])
            }
            notifications.append(notif)
        
        if notifications:
            batch_size = 50
            for i in range(0, len(notifications), batch_size):
                batch = notifications[i:i + batch_size]
                result = supabase.table('notifications').insert(batch).execute()
                print(f"   ✅ Imported notifications {i+1}-{min(i+batch_size, len(notifications))}")
            print(f"   ✅ Total: {len(notifications)} notifications imported")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "="*60)
print("✅ MIGRATION COMPLETE!")
print("="*60)
print("\n📊 Summary:")
print("   - Location Areas: Check table")
print("   - Tags: Check table")
print("   - Users: Check table")
print("   - Businesses: Check table")
print("   - Offers: Check table")
print("   - Loyalty Points: Check table")
print("   - Notifications: Check table")
print("\n🔍 Next Steps:")
print("   1. Go to Supabase Dashboard → Table Editor")
print("   2. Verify data looks correct")
print("   3. Check for any missing relationships")
print("   4. Set up Storage buckets for images")
print("   5. Configure Row Level Security policies")
print("\n🎉 Your data is now in Supabase!")
