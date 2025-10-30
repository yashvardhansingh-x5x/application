import { MongoClient, ObjectId } from 'mongodb';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

const client = new MongoClient(process.env.MONGO_URL);
const resend = new Resend(process.env.RESEND_API_KEY);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db();
  }
  return db;
}

// GET /api/services - Get all services
async function getServices() {
  const database = await connectDB();
  const services = await database.collection('services').find({}).toArray();
  return NextResponse.json({ success: true, data: services });
}

// GET /api/services/:id - Get single service
async function getServiceById(id) {
  const database = await connectDB();
  const service = await database.collection('services').findOne({ id });
  if (!service) {
    return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: service });
}

// POST /api/services - Create service
async function createService(data) {
  const database = await connectDB();
  const service = {
    id: uuidv4(),
    ...data,
    createdAt: new Date().toISOString(),
  };
  await database.collection('services').insertOne(service);
  return NextResponse.json({ success: true, data: service });
}

// PUT /api/services/:id - Update service
async function updateService(id, data) {
  const database = await connectDB();
  const result = await database.collection('services').updateOne(
    { id },
    { $set: { ...data, updatedAt: new Date().toISOString() } }
  );
  if (result.matchedCount === 0) {
    return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Service updated' });
}

// DELETE /api/services/:id - Delete service
async function deleteService(id) {
  const database = await connectDB();
  const result = await database.collection('services').deleteOne({ id });
  if (result.deletedCount === 0) {
    return NextResponse.json({ success: false, error: 'Service not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: 'Service deleted' });
}

// POST /api/contact - Submit contact form
async function submitContact(data) {
  try {
    const database = await connectDB();
    
    // Validate data
    if (!data.name || !data.email || !data.message) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Save to database
    const contact = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      company: data.company || '',
      message: data.message,
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    
    await database.collection('contacts').insertOne(contact);

    // Send email notification
    try {
      await resend.emails.send({
        from: 'TechStartup Contact <onboarding@resend.dev>',
        to: [process.env.RECIPIENT_EMAIL || 'contact@techstartup.com'],
        subject: `New Contact Form Submission from ${data.name}`,
        replyTo: data.email,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">New Contact Form Submission</h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> ${data.name}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ''}
              ${data.company ? `<p><strong>Company:</strong> ${data.company}</p>` : ''}
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${data.message}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This message was sent from your website contact form.</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails - data is saved in DB
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message! We will get back to you soon.',
      data: contact,
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit contact form' },
      { status: 500 }
    );
  }
}

// GET /api/contacts - Get all contacts
async function getContacts() {
  const database = await connectDB();
  const contacts = await database.collection('contacts').find({}).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ success: true, data: contacts });
}

// Initialize default services
async function initializeServices() {
  const database = await connectDB();
  const count = await database.collection('services').countDocuments();
  
  if (count === 0) {
    const defaultServices = [
      {
        id: uuidv4(),
        title: 'Product Development',
        description: 'Build cutting-edge web and mobile applications with modern technologies. Our expert team delivers scalable, user-centric solutions.',
        icon: 'Code',
        features: ['Web Development', 'Mobile Apps', 'UI/UX Design', 'Prototyping'],
        category: 'development',
        image: 'https://images.unsplash.com/photo-1591439657848-9f4b9ce436b9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxzb2Z0d2FyZSUyMGRldmVsb3BtZW50JTIwY29kaW5nfGVufDB8fHxibHVlfDE3NjE4NTA2ODB8MA&ixlib=rb-4.1.0&q=85',
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Cloud & DevOps',
        description: 'Streamline your infrastructure with AWS, Azure, and GCP. Implement CI/CD pipelines for faster, reliable deployments.',
        icon: 'Cloud',
        features: ['AWS/Azure/GCP', 'CI/CD Pipelines', 'Infrastructure as Code', 'Container Orchestration'],
        category: 'infrastructure',
        image: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxzb2Z0d2FyZSUyMGRldmVsb3BtZW50JTIwY29kaW5nfGVufDB8fHxibHVlfDE3NjE4NTA2ODB8MA&ixlib=rb-4.1.0&q=85',
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Data & AI',
        description: 'Unlock insights from your data with advanced analytics and machine learning. Transform data into actionable intelligence.',
        icon: 'Database',
        features: ['Data Science', 'Machine Learning', 'Predictive Analytics', 'Big Data Processing'],
        category: 'data',
        image: 'https://images.unsplash.com/photo-1665211097563-163d6be45d67?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwzfHxzb2Z0d2FyZSUyMGRldmVsb3BtZW50JTIwY29kaW5nfGVufDB8fHxibHVlfDE3NjE4NTA2ODB8MA&ixlib=rb-4.1.0&q=85',
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Automation & Integration',
        description: 'Automate repetitive tasks and integrate systems seamlessly. Boost productivity with RPA and API automation.',
        icon: 'Workflow',
        features: ['RPA Solutions', 'API Integration', 'Workflow Automation', 'System Integration'],
        category: 'automation',
        image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHw0fHxzb2Z0d2FyZSUyMGRldmVsb3BtZW50JTIwY29kaW5nfGVufDB8fHxibHVlfDE3NjE4NTA2ODB8MA&ixlib=rb-4.1.0&q=85',
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Cybersecurity',
        description: 'Protect your business with comprehensive security solutions. From audits to monitoring, we keep your data safe.',
        icon: 'Shield',
        features: ['Security Audits', 'Compliance', 'Threat Monitoring', 'Penetration Testing'],
        category: 'security',
        image: 'https://images.unsplash.com/photo-1532102235608-dc8fc689c9ab?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzfGVufDB8fHxibHVlfDE3NjE4NTA2OTJ8MA&ixlib=rb-4.1.0&q=85',
        createdAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: 'IT Consulting & Support',
        description: 'Strategic technology consulting and managed services. We help you navigate digital transformation with confidence.',
        icon: 'Users',
        features: ['Tech Strategy', 'Managed Services', '24/7 Support', 'Digital Transformation'],
        category: 'consulting',
        image: 'https://images.unsplash.com/photo-1650327034581-1711a15a5430?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwyfHxkYXRhJTIwYW5hbHl0aWNzfGVufDB8fHxibHVlfDE3NjE4NTA2OTJ8MA&ixlib=rb-4.1.0&q=85',
        createdAt: new Date().toISOString(),
      },
    ];
    
    await database.collection('services').insertMany(defaultServices);
  }
}

// Main request handler
export async function GET(request) {
  try {
    await initializeServices();
    
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    
    if (path === '/services' || path === '/services/') {
      return await getServices();
    }
    
    if (path.startsWith('/services/')) {
      const id = path.split('/')[2];
      return await getServiceById(id);
    }
    
    if (path === '/contacts' || path === '/contacts/') {
      return await getContacts();
    }
    
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    const data = await request.json();
    
    if (path === '/services' || path === '/services/') {
      return await createService(data);
    }
    
    if (path === '/contact' || path === '/contact/') {
      return await submitContact(data);
    }
    
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    const data = await request.json();
    
    if (path.startsWith('/services/')) {
      const id = path.split('/')[2];
      return await updateService(id, data);
    }
    
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api', '');
    
    if (path.startsWith('/services/')) {
      const id = path.split('/')[2];
      return await deleteService(id);
    }
    
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}