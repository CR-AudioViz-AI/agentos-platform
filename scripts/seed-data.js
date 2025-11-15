/**
 * AgentOS Platform - Sample Data Seeding Script
 * Populates database with realistic test data
 * Run this after deploying the database schema to Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample company data
const companies = [
  {
    name: 'Sunshine Realty Group',
    slug: 'sunshine-realty',
    email: 'info@sunshinerealty.com',
    phone: '(239) 555-0100',
    address: '123 Palm Avenue',
    city: 'Fort Myers',
    state: 'FL',
    zip: '33901',
    website: 'https://sunshinerealty.com',
    plan_type: 'team',
    plan_status: 'active',
    agent_seats: 5,
    active_agents: 3,
    mls_enabled: true,
    homefinder_enabled: true
  },
  {
    name: 'Coastal Properties LLC',
    slug: 'coastal-properties',
    email: 'contact@coastalprops.com',
    phone: '(239) 555-0200',
    address: '456 Beach Road',
    city: 'Cape Coral',
    state: 'FL',
    zip: '33904',
    website: 'https://coastalprops.com',
    plan_type: 'broker',
    plan_status: 'active',
    agent_seats: 15,
    active_agents: 12,
    mls_enabled: true,
    homefinder_enabled: true
  }
];

// Sample properties
const generateProperties = (companyId, agentId) => [
  {
    company_id: companyId,
    listing_agent_id: agentId,
    title: 'Stunning Waterfront Home with Pool',
    address: '789 Riverfront Drive',
    city: 'Fort Myers',
    state: 'FL',
    zip: '33901',
    price: 875000,
    bedrooms: 4,
    bathrooms: 3.5,
    square_feet: 3200,
    lot_size: 10500,
    year_built: 2018,
    property_type: 'residential',
    listing_type: 'sale',
    status: 'active',
    description: 'Beautiful waterfront property featuring panoramic river views, custom-built in 2018. Open floor plan with gourmet kitchen, granite countertops, and stainless steel appliances. Master suite with spa-like bathroom and walk-in closet. Resort-style pool and outdoor entertainment area. Private dock with boat lift. Hurricane-rated windows and impact-resistant doors.',
    features: ['Waterfront', 'Pool', 'Boat Dock', 'Hurricane Windows', 'Granite Countertops', 'Walk-in Closets', 'Smart Home', 'Security System'],
    amenities: ['Gated Community', 'Club House', 'Tennis Courts', 'Fitness Center'],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    show_on_homefinder: true,
    homefinder_featured: true,
    hoa_fees: 250,
    property_taxes: 8750
  },
  {
    company_id: companyId,
    listing_agent_id: agentId,
    title: 'Modern 3BR Townhome in Gated Community',
    address: '321 Garden Court',
    city: 'Cape Coral',
    state: 'FL',
    zip: '33904',
    price: 385000,
    bedrooms: 3,
    bathrooms: 2.5,
    square_feet: 1850,
    lot_size: 2200,
    year_built: 2020,
    property_type: 'residential',
    listing_type: 'sale',
    status: 'active',
    description: 'Contemporary townhome in sought-after gated community. Upgraded finishes throughout including quartz counters, luxury vinyl plank flooring, and designer light fixtures. Open-concept living with large windows providing natural light. Private patio perfect for entertaining. Community amenities include pool, clubhouse, and playground. Minutes from shopping, dining, and beaches.',
    features: ['Quartz Countertops', 'LVP Flooring', 'Patio', 'Attached Garage', 'Tankless Water Heater', 'Energy Efficient'],
    amenities: ['Community Pool', 'Playground', 'Clubhouse', 'Gated Entry'],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    show_on_homefinder: true,
    hoa_fees: 195,
    property_taxes: 4620
  },
  {
    company_id: companyId,
    listing_agent_id: agentId,
    title: 'Charming 2BR Cottage Near Downtown',
    address: '567 Oak Street',
    city: 'Fort Myers',
    state: 'FL',
    zip: '33901',
    price: 295000,
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1200,
    lot_size: 6000,
    year_built: 1955,
    property_type: 'residential',
    listing_type: 'sale',
    status: 'active',
    description: 'Adorable cottage-style home with tons of character and recent updates. Newer roof, AC, and windows. Original hardwood floors refinished. Updated kitchen with white cabinets and stainless appliances. Spacious backyard with mature oak trees and covered patio. Perfect for first-time buyers or investors. Walk to downtown restaurants, shops, and riverfront.',
    features: ['Hardwood Floors', 'Updated Kitchen', 'New Roof', 'Covered Patio', 'Mature Trees', 'Off-Street Parking'],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    show_on_homefinder: true,
    property_taxes: 3540
  },
  {
    company_id: companyId,
    listing_agent_id: agentId,
    title: 'Luxury Penthouse Condo with Gulf Views',
    address: '1000 Estero Boulevard, Unit PH1',
    city: 'Fort Myers Beach',
    state: 'FL',
    zip: '33931',
    price: 1250000,
    bedrooms: 3,
    bathrooms: 3,
    square_feet: 2400,
    year_built: 2019,
    property_type: 'residential',
    listing_type: 'sale',
    status: 'active',
    description: 'Spectacular penthouse offering unobstructed Gulf of Mexico views. Floor-to-ceiling windows frame breathtaking sunsets. Gourmet kitchen with custom cabinetry, quartz counters, and top-of-the-line appliances. Private elevator access. Two balconies totaling 600 sq ft. Master suite with dual walk-in closets and spa bath. Deeded beach access, resort-style pool, fitness center.',
    features: ['Gulf Views', 'Private Elevator', 'Two Balconies', 'Gourmet Kitchen', 'Custom Closets', 'Smart Home', 'Secured Building'],
    amenities: ['Beach Access', 'Resort Pool', 'Fitness Center', 'Concierge', 'Guest Suites', 'Storage'],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    show_on_homefinder: true,
    homefinder_featured: true,
    hoa_fees: 850,
    property_taxes: 15000
  },
  {
    company_id: companyId,
    listing_agent_id: agentId,
    title: 'Spacious 4BR Family Home with Bonus Room',
    address: '234 Maple Lane',
    city: 'Cape Coral',
    state: 'FL',
    zip: '33909',
    price: 425000,
    bedrooms: 4,
    bathrooms: 3,
    square_feet: 2600,
    lot_size: 8500,
    year_built: 2015,
    property_type: 'residential',
    listing_type: 'sale',
    status: 'active',
    description: 'Well-maintained family home in excellent school district. Split bedroom floor plan provides privacy. Large kitchen with island, granite counters, and breakfast nook. Formal dining and living rooms. Bonus room perfect for home office or playroom. Screened lanai overlooks fenced backyard with room for pool. Three-car garage. Close to parks and shopping.',
    features: ['Split Floor Plan', 'Bonus Room', 'Screened Lanai', '3-Car Garage', 'Granite Kitchen', 'Fenced Yard', 'Ceiling Fans'],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    show_on_homefinder: true,
    property_taxes: 5100
  },
  // Rental properties
  {
    company_id: companyId,
    listing_agent_id: agentId,
    title: 'Fully Furnished 2BR Beach Condo',
    address: '789 Beach Drive, Unit 302',
    city: 'Fort Myers Beach',
    state: 'FL',
    zip: '33931',
    price: 3500,
    bedrooms: 2,
    bathrooms: 2,
    square_feet: 1100,
    year_built: 2016,
    property_type: 'rental',
    listing_type: 'rent',
    status: 'active',
    description: 'Turnkey beach condo available for annual or seasonal rental. Completely furnished with coastal decor. Updated kitchen and baths. Tile throughout. Gulf-front balcony with stunning views. Community pool, BBQ area, and direct beach access. One covered parking space included. Perfect for winter retreat or year-round living.',
    features: ['Fully Furnished', 'Gulf Front', 'Balcony', 'Tile Floors', 'Updated', 'Covered Parking'],
    amenities: ['Beach Access', 'Pool', 'BBQ Area'],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    show_on_homefinder: true,
    hoa_fees: 450
  },
  {
    company_id: companyId,
    listing_agent_id: agentId,
    title: 'Cozy 1BR Apartment Near Downtown',
    address: '456 Central Avenue, Apt 2B',
    city: 'Fort Myers',
    state: 'FL',
    zip: '33901',
    price: 1400,
    bedrooms: 1,
    bathrooms: 1,
    square_feet: 650,
    year_built: 2010,
    property_type: 'rental',
    listing_type: 'rent',
    status: 'active',
    description: 'Charming one-bedroom in historic building. Hardwood floors, high ceilings, large windows. Updated kitchen with stainless appliances. Walk-in closet. On-site laundry. One assigned parking space. Walk to restaurants, shops, river district nightlife. Water and trash included in rent.',
    features: ['Hardwood Floors', 'High Ceilings', 'Walk-in Closet', 'On-Site Laundry', 'Assigned Parking'],
    images: [
      '/api/placeholder/800/600',
      '/api/placeholder/800/600'
    ],
    show_on_homefinder: true
  }
];

// Sample leads
const generateLeads = (companyId, agentId) => [
  {
    company_id: companyId,
    assigned_agent_id: agentId,
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '(239) 555-1001',
    source: 'homefinder',
    status: 'new',
    lead_type: 'buyer',
    price_range_min: 300000,
    price_range_max: 500000,
    preferred_locations: ['Fort Myers', 'Cape Coral'],
    property_type_preferences: ['residential'],
    notes: 'Looking for 3BR home with pool. Pre-approved for $450K. Wants to move within 60 days.'
  },
  {
    company_id: companyId,
    assigned_agent_id: agentId,
    first_name: 'Michael',
    last_name: 'Chen',
    email: 'mchen@email.com',
    phone: '(239) 555-1002',
    source: 'website',
    status: 'contacted',
    lead_type: 'buyer',
    price_range_min: 200000,
    price_range_max: 350000,
    preferred_locations: ['Cape Coral', 'Fort Myers'],
    property_type_preferences: ['residential'],
    notes: 'First-time buyer. Interested in townhomes or condos. Following up next Tuesday.'
  },
  {
    company_id: companyId,
    assigned_agent_id: agentId,
    first_name: 'Jessica',
    last_name: 'Martinez',
    email: 'jessica.m@email.com',
    phone: '(239) 555-1003',
    source: 'referral',
    status: 'qualified',
    lead_type: 'seller',
    notes: 'Wants to sell 4BR home in Cape Coral. Inherited property, needs quick sale. Scheduling CMA appointment.'
  },
  {
    company_id: companyId,
    assigned_agent_id: agentId,
    first_name: 'David',
    last_name: 'Thompson',
    email: 'dthompson@email.com',
    phone: '(239) 555-1004',
    source: 'homefinder',
    status: 'nurturing',
    lead_type: 'buyer',
    price_range_min: 800000,
    price_range_max: 1500000,
    preferred_locations: ['Fort Myers Beach', 'Sanibel'],
    property_type_preferences: ['residential'],
    notes: 'Looking for waterfront property. Not in a rush, wants to see everything available. Sending weekly updates.'
  },
  {
    company_id: companyId,
    assigned_agent_id: agentId,
    first_name: 'Emily',
    last_name: 'Rodriguez',
    email: 'emily.r@email.com',
    phone: '(239) 555-1005',
    source: 'marketing',
    status: 'new',
    lead_type: 'renter',
    price_range_min: 1200,
    price_range_max: 2000,
    preferred_locations: ['Fort Myers'],
    notes: 'Relocating for work in 30 days. Needs pet-friendly rental, 2BR minimum.'
  }
];

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // 1. Create companies
    console.log('Creating companies...');
    const { data: createdCompanies, error: companyError } = await supabase
      .from('companies')
      .insert(companies)
      .select();

    if (companyError) throw companyError;
    console.log(`✅ Created ${createdCompanies.length} companies\n`);

    // 2. Create sample properties for each company
    console.log('Creating properties...');
    let totalProperties = 0;
    
    for (const company of createdCompanies) {
      // Create a sample agent for this company (you'll need to create auth users first in production)
      const sampleAgentId = '00000000-0000-0000-0000-000000000000'; // Replace with actual user ID
      
      const properties = generateProperties(company.id, sampleAgentId);
      const { data: createdProperties, error: propertyError } = await supabase
        .from('properties')
        .insert(properties)
        .select();

      if (propertyError) {
        console.log(`⚠️  Error creating properties for ${company.name}:`, propertyError.message);
      } else {
        totalProperties += createdProperties.length;
        console.log(`✅ Created ${createdProperties.length} properties for ${company.name}`);
      }
    }
    console.log(`✅ Total properties created: ${totalProperties}\n`);

    // 3. Create sample leads for each company
    console.log('Creating leads...');
    let totalLeads = 0;
    
    for (const company of createdCompanies) {
      const sampleAgentId = '00000000-0000-0000-0000-000000000000'; // Replace with actual user ID
      
      const leads = generateLeads(company.id, sampleAgentId);
      const { data: createdLeads, error: leadError } = await supabase
        .from('leads')
        .insert(leads)
        .select();

      if (leadError) {
        console.log(`⚠️  Error creating leads for ${company.name}:`, leadError.message);
      } else {
        totalLeads += createdLeads.length;
        console.log(`✅ Created ${createdLeads.length} leads for ${company.name}`);
      }
    }
    console.log(`✅ Total leads created: ${totalLeads}\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('Summary:');
    console.log(`  - ${createdCompanies.length} companies`);
    console.log(`  - ${totalProperties} properties`);
    console.log(`  - ${totalLeads} leads`);
    console.log('\n📝 Next steps:');
    console.log('  1. Create auth users in Supabase Auth');
    console.log('  2. Update user profiles with company associations');
    console.log('  3. Link properties and leads to actual agent IDs');
    console.log('  4. Test the application with real user accounts');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
