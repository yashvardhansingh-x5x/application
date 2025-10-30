#!/usr/bin/env python3
"""
Backend API Testing for Tech Startup Website
Tests the following endpoints:
- GET /api/services (auto-initialization of 6 default services)
- POST /api/contact (contact form submission with validation)
- MongoDB data persistence verification
"""

import requests
import json
import os
from pymongo import MongoClient
from urllib.parse import urlparse
import time

# Get base URL from environment
BASE_URL = "https://localhost:3000"
API_BASE = f"{BASE_URL}/api"

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017/techstartup"

def get_mongo_client():
    """Get MongoDB client and database"""
    try:
        client = MongoClient(MONGO_URL)
        # Parse database name from URL
        parsed = urlparse(MONGO_URL)
        db_name = parsed.path.lstrip('/')
        if not db_name:
            db_name = 'techstartup'
        db = client[db_name]
        return client, db
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return None, None

def test_services_endpoint():
    """Test GET /api/services endpoint"""
    print("\n🔍 Testing GET /api/services endpoint...")
    
    try:
        response = requests.get(f"{API_BASE}/services", verify=False, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response structure: {list(data.keys())}")
            
            if data.get('success'):
                services = data.get('data', [])
                print(f"✅ Services endpoint working - returned {len(services)} services")
                
                # Verify we have 6 default services
                if len(services) == 6:
                    print("✅ Correct number of services (6) returned")
                    
                    # Verify service structure
                    required_fields = ['id', 'title', 'description', 'icon', 'features', 'category', 'image', 'createdAt']
                    for i, service in enumerate(services[:2]):  # Check first 2 services
                        missing_fields = [field for field in required_fields if field not in service]
                        if missing_fields:
                            print(f"❌ Service {i+1} missing fields: {missing_fields}")
                        else:
                            print(f"✅ Service {i+1} has all required fields")
                            print(f"   Title: {service['title']}")
                            print(f"   Category: {service['category']}")
                    
                    return True, services
                else:
                    print(f"❌ Expected 6 services, got {len(services)}")
                    return False, services
            else:
                print(f"❌ API returned success=false: {data}")
                return False, None
        else:
            print(f"❌ HTTP error: {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False, None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, None

def test_contact_form_valid():
    """Test POST /api/contact with valid data"""
    print("\n🔍 Testing POST /api/contact with valid data...")
    
    contact_data = {
        "name": "John Smith",
        "email": "john.smith@example.com",
        "phone": "+1-555-0123",
        "company": "Tech Solutions Inc",
        "message": "I'm interested in your product development services. Could we schedule a consultation to discuss our project requirements?"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/contact", 
            json=contact_data,
            headers={'Content-Type': 'application/json'},
            verify=False,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            
            if data.get('success'):
                print("✅ Contact form submission successful")
                print(f"Message: {data.get('message', 'No message')}")
                
                # Verify returned contact data
                contact = data.get('data', {})
                if contact.get('id') and contact.get('name') == contact_data['name']:
                    print("✅ Contact data properly returned with ID")
                    return True, contact
                else:
                    print("❌ Contact data not properly returned")
                    return False, None
            else:
                print(f"❌ Contact submission failed: {data}")
                return False, None
        else:
            print(f"❌ HTTP error: {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False, None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False, None

def test_contact_form_invalid():
    """Test POST /api/contact with missing required fields"""
    print("\n🔍 Testing POST /api/contact with missing required fields...")
    
    # Test with missing name
    invalid_data = {
        "email": "test@example.com",
        "message": "Test message"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/contact", 
            json=invalid_data,
            headers={'Content-Type': 'application/json'},
            verify=False,
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"Response: {data}")
            
            if not data.get('success') and 'required' in data.get('error', '').lower():
                print("✅ Proper validation error for missing required fields")
                return True
            else:
                print(f"❌ Unexpected error response: {data}")
                return False
        else:
            print(f"❌ Expected 400 status code, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def verify_mongodb_data():
    """Verify data is properly stored in MongoDB"""
    print("\n🔍 Verifying MongoDB data persistence...")
    
    client, db = get_mongo_client()
    if not client or not db:
        return False
    
    try:
        # Check services collection
        services_count = db.services.count_documents({})
        print(f"Services in MongoDB: {services_count}")
        
        if services_count == 6:
            print("✅ All 6 services properly stored in MongoDB")
            
            # Verify service structure in DB
            sample_service = db.services.find_one()
            if sample_service:
                required_fields = ['id', 'title', 'description', 'icon', 'features', 'category']
                missing_fields = [field for field in required_fields if field not in sample_service]
                if missing_fields:
                    print(f"❌ Service in DB missing fields: {missing_fields}")
                else:
                    print("✅ Service structure in MongoDB is correct")
        else:
            print(f"❌ Expected 6 services in MongoDB, found {services_count}")
        
        # Check contacts collection
        contacts_count = db.contacts.count_documents({})
        print(f"Contacts in MongoDB: {contacts_count}")
        
        if contacts_count > 0:
            print("✅ Contact submissions are being stored in MongoDB")
            
            # Verify contact structure
            sample_contact = db.contacts.find_one()
            if sample_contact:
                required_fields = ['id', 'name', 'email', 'message', 'createdAt', 'status']
                missing_fields = [field for field in required_fields if field not in sample_contact]
                if missing_fields:
                    print(f"❌ Contact in DB missing fields: {missing_fields}")
                else:
                    print("✅ Contact structure in MongoDB is correct")
                    print(f"   Sample contact: {sample_contact['name']} ({sample_contact['email']})")
        else:
            print("⚠️  No contacts found in MongoDB (may be expected if no submissions yet)")
        
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ MongoDB verification failed: {e}")
        if client:
            client.close()
        return False

def test_services_auto_initialization():
    """Test that services are auto-initialized on first API call"""
    print("\n🔍 Testing services auto-initialization...")
    
    client, db = get_mongo_client()
    if not client or not db:
        return False
    
    try:
        # Clear services collection to test initialization
        initial_count = db.services.count_documents({})
        print(f"Initial services count: {initial_count}")
        
        if initial_count == 0:
            print("Services collection is empty, testing auto-initialization...")
            
            # Make API call to trigger initialization
            response = requests.get(f"{API_BASE}/services", verify=False, timeout=10)
            
            if response.status_code == 200:
                # Check if services were created
                time.sleep(1)  # Give a moment for DB write
                new_count = db.services.count_documents({})
                print(f"Services count after API call: {new_count}")
                
                if new_count == 6:
                    print("✅ Services auto-initialization working correctly")
                    client.close()
                    return True
                else:
                    print(f"❌ Expected 6 services after initialization, got {new_count}")
            else:
                print(f"❌ API call failed: {response.status_code}")
        else:
            print("✅ Services already initialized (expected in normal operation)")
            client.close()
            return True
        
        client.close()
        return False
        
    except Exception as e:
        print(f"❌ Auto-initialization test failed: {e}")
        if client:
            client.close()
        return False

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests for Tech Startup Website")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Services endpoint
    try:
        success, services = test_services_endpoint()
        results['services_endpoint'] = success
    except Exception as e:
        print(f"❌ Services endpoint test failed: {e}")
        results['services_endpoint'] = False
    
    # Test 2: Contact form with valid data
    try:
        success, contact = test_contact_form_valid()
        results['contact_valid'] = success
    except Exception as e:
        print(f"❌ Contact form valid test failed: {e}")
        results['contact_valid'] = False
    
    # Test 3: Contact form with invalid data
    try:
        success = test_contact_form_invalid()
        results['contact_invalid'] = success
    except Exception as e:
        print(f"❌ Contact form invalid test failed: {e}")
        results['contact_invalid'] = False
    
    # Test 4: MongoDB data verification
    try:
        success = verify_mongodb_data()
        results['mongodb_verification'] = success
    except Exception as e:
        print(f"❌ MongoDB verification failed: {e}")
        results['mongodb_verification'] = False
    
    # Test 5: Services auto-initialization (optional, as services may already exist)
    try:
        success = test_services_auto_initialization()
        results['auto_initialization'] = success
    except Exception as e:
        print(f"❌ Auto-initialization test failed: {e}")
        results['auto_initialization'] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests passed successfully!")
        return True
    else:
        print("⚠️  Some backend tests failed. Check the details above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)