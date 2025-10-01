// server/routes/restaurants.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail } from '../utils/email.js';
import { menuManager } from '../menu_manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function setupRestaurantRoutes(app) {
  app.post('/v1/restaurants/signup', async (req, res) => {
    try {
      const { 
        restaurant_name,
        email,
        phone,
        location,
        cuisine_type,
        website,
        approximate_menu_items,
        current_pos_systems,
        goals,
        contact
      } = req.body;

      // Generate unique ID
      const restaurant_id = restaurant_name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') + '_' + Date.now();

      // Determine tier based on current count
      const profilesPath = path.resolve(__dirname, '../../data/restaurant_profiles.json');
      let profiles = {};
      try {
        const data = await fs.readFile(profilesPath, 'utf8');
        profiles = JSON.parse(data);
      } catch (err) {
        console.log('Creating new restaurant_profiles.json');
      }
      
      const currentCount = Object.keys(profiles).length;
      let tier = 'self_serve';
      if (currentCount < 20) tier = 'white_glove';
      else if (currentCount < 50) tier = 'assisted';

      const restaurantProfile = {
        restaurant_id,
        restaurant_name,
        email,
        phone,
        location,
        cuisine_type,
        website,
        metadata: {
          menu_size: approximate_menu_items,
          pos_systems: current_pos_systems?.split(',').map(s => s.trim()) || [],
          goals: Array.isArray(goals) ? goals : [],
          signup_date: new Date().toISOString()
        },
        contact,
        tier,
        status: tier === 'white_glove' ? 'pending_contact' : 'pending_menu_upload',
        created_at: new Date().toISOString()
      };

      // Save to file
      profiles[restaurant_id] = restaurantProfile;
      await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));

      console.log(`✅ Restaurant signup #${currentCount + 1}: ${restaurant_name} (tier: ${tier})`);

      // Create empty menu entry in MenuManager
    await menuManager.addRestaurantMenu({
    restaurant_id,
    restaurant_name,
    location: {
        city: location.city,
        country_code: location.country_code,
        address: location.address || ''
    },
    cuisine_type,
    website,
    phone,
    metadata: {
        goals: Array.isArray(goals) ? goals : [],
        menu_size: approximate_menu_items,
        pos_systems: current_pos_systems?.split(',').map(s => s.trim()) || []
    },
    menu_items: [], // Empty - they'll add via dashboard
    delivery_platforms: {},
    opening_hours: {}
    });

    console.log(`📋 Created empty menu entry for ${restaurant_name}`);

      // === EMAIL NOTIFICATIONS ===
      
      // 1. Email to VFIED team
      const teamEmail = process.env.VFIED_TEAM_EMAIL;
      if (teamEmail) {
        await sendEmail({
          to: teamEmail,
          subject: `🎉 New Restaurant Signup #${currentCount + 1}: ${restaurant_name}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">New Restaurant Partner!</h2>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Restaurant:</strong> ${restaurant_name}</p>
                <p><strong>Contact:</strong> ${contact.first_name} ${contact.last_name}</p>
                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Location:</strong> ${location.city}, ${location.country_code}</p>
                <p><strong>Cuisine:</strong> ${cuisine_type}</p>
                <p><strong>Website:</strong> ${website ? `<a href="${website}">${website}</a>` : 'Not provided'}</p>
                <p><strong>Tier:</strong> <span style="background: #fbbf24; padding: 4px 12px; border-radius: 4px; font-weight: bold;">${tier.toUpperCase()}</span></p>
                <p><strong>Menu Size:</strong> ${approximate_menu_items || 'Not specified'}</p>
                <p><strong>Goals:</strong> ${Array.isArray(goals) ? goals.join(', ') : 'None specified'}</p>
              </div>
              <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Next Action:</strong></p>
                <p style="margin: 8px 0 0 0;">
                  ${tier === 'white_glove' 
                    ? '📞 Contact within 24 hours to schedule onboarding call' 
                    : '📧 They received automated dashboard access'}
                </p>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                <strong>Restaurant ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${restaurant_id}</code>
              </p>
            </div>
          `
        });
      }

      // 2. Email to restaurant
      const tierMessages = {
        white_glove: {
          subject: 'Welcome to VFIED - Your Personalized Onboarding Awaits!',
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Welcome to VFIED, ${contact.first_name}!</h2>
              <p>Thank you for joining VFIED as one of our first 20 restaurant partners.</p>
              <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0;"><strong>What happens next:</strong></p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">You're confirmed as a <strong>White Glove Partner</strong></li>
                  <li style="margin: 8px 0;">We'll email you within 24 hours to schedule your onboarding call</li>
                  <li style="margin: 8px 0;">On the call, we'll help you upload your first menu items</li>
                  <li style="margin: 8px 0;">You'll be live on VFIED within 48 hours</li>
                </ul>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                <strong>Your Restaurant ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${restaurant_id}</code>
              </p>
              <p>Questions? Reply to this email anytime.</p>
              <p style="color: #6b7280;">- The VFIED Team</p>
            </div>
          `
        },
        assisted: {
          subject: 'Welcome to VFIED - Dashboard Access Inside!',
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Welcome to VFIED, ${contact.first_name}!</h2>
              <p>Your restaurant dashboard is ready!</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://vfied-v4-clean.onrender.com/dashboard?id=${restaurant_id}" 
                   style="background: #7c3aed; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Access Your Dashboard
                </a>
              </div>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0;"><strong>What you can do:</strong></p>
                <ul style="margin: 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">Upload your menu items</li>
                  <li style="margin: 8px 0;">View analytics (coming soon)</li>
                  <li style="margin: 8px 0;">Optional: Book a support call if needed</li>
                </ul>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                <strong>Your Restaurant ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${restaurant_id}</code>
              </p>
              <p>Need help? Reply to this email.</p>
              <p style="color: #6b7280;">- The VFIED Team</p>
            </div>
          `
        },
        self_serve: {
          subject: "You're Live on VFIED!",
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Welcome to VFIED, ${contact.first_name}!</h2>
              <p>Your instant access is ready!</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://vfied-v4-clean.onrender.com/dashboard?id=${restaurant_id}" 
                   style="background: #7c3aed; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                  Go to Dashboard
                </a>
              </div>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 12px 0;"><strong>Quick Start:</strong></p>
                <ol style="margin: 0; padding-left: 20px;">
                  <li style="margin: 8px 0;">Upload your menu</li>
                  <li style="margin: 8px 0;">You'll appear in food recommendations immediately</li>
                  <li style="margin: 8px 0;">Check analytics weekly</li>
                </ol>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                <strong>Your Restaurant ID:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${restaurant_id}</code>
              </p>
              <p>Questions? Our help docs are <a href="https://vfied-v4-clean.onrender.com/docs">here</a>.</p>
              <p style="color: #6b7280;">- The VFIED Team</p>
            </div>
          `
        }
      };

      await sendEmail({
        to: email,
        subject: tierMessages[tier].subject,
        html: tierMessages[tier].html
      });

      // Return response
      const messages = {
        white_glove: 'As one of our first 20 partners, you\'ll get personalized onboarding. Check your email!',
        assisted: 'Welcome! Check your email for dashboard access.',
        self_serve: 'You\'re in! Check your email for instant dashboard access.'
      };

      res.json({ 
        success: true, 
        message: messages[tier],
        tier,
        restaurant_id
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  // Add menu item endpoint
app.post('/v1/restaurants/:restaurant_id/menu-items', async (req, res) => {
  try {
    const { restaurant_id } = req.params;
    const { menu_items } = req.body;

    if (!Array.isArray(menu_items) || menu_items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'menu_items must be a non-empty array' 
      });
    }

    // Find restaurant in MenuManager
    const restaurantKey = Array.from(menuManager.menus.keys())
      .find(key => key.includes(restaurant_id));

    if (!restaurantKey) {
      return res.status(404).json({ 
        success: false, 
        error: 'Restaurant not found' 
      });
    }

    // Add menu items
    const restaurant = menuManager.menus.get(restaurantKey);
    
    for (const item of menu_items) {
      const processedItem = {
        menu_item_id: `${restaurant_id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        name: item.name.trim(),
        emoji: item.emoji || menuManager.getEmoji(item),
        price: item.price || '—',
        description: item.description || '',
        category: item.category || 'main',
        tags: Array.isArray(item.tags) ? item.tags : [],
        meal_period: item.meal_period || menuManager.detectMealPeriod(item),
        search_tags: menuManager.generateSearchTags(item),
        dietary: {
          vegetarian: Boolean(item.dietary?.vegetarian),
          vegan: Boolean(item.dietary?.vegan),
          gluten_free: Boolean(item.dietary?.gluten_free),
          dairy_free: Boolean(item.dietary?.dairy_free),
          halal: Boolean(item.dietary?.halal)
        },
        available: item.available !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      restaurant.menu_items.push(processedItem);
    }

    restaurant.updated_at = new Date().toISOString();
    menuManager.updateStats();
    await menuManager.saveMenus();

    res.json({ 
      success: true, 
      message: `Added ${menu_items.length} items`,
      total_items: restaurant.menu_items.length
    });

  } catch (error) {
    console.error('Menu upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get restaurant menu
app.get('/v1/restaurants/:restaurant_id/menu', async (req, res) => {
  try {
    const { restaurant_id } = req.params;

    const restaurantKey = Array.from(menuManager.menus.keys())
      .find(key => key.includes(restaurant_id));

    if (!restaurantKey) {
      return res.status(404).json({ 
        success: false, 
        error: 'Restaurant not found' 
      });
    }

    const restaurant = menuManager.menus.get(restaurantKey);

    res.json({ 
      success: true, 
      restaurant: {
        id: restaurant.restaurant_id,
        name: restaurant.restaurant_name,
        location: restaurant.location,
        cuisine_type: restaurant.cuisine_type,
        menu_items: restaurant.menu_items,
        total_items: restaurant.menu_items.length
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// List all restaurants in MenuManager
app.get('/v1/restaurants/list', async (req, res) => {
  try {
    const allRestaurants = Array.from(menuManager.menus.keys()).map(key => {
      const menu = menuManager.menus.get(key);
      return {
        key,
        restaurant_id: menu.restaurant_id,
        name: menu.restaurant_name,
        location: menu.location,
        menu_items_count: menu.menu_items.length
      };
    });
    
    res.json({ 
      success: true, 
      count: allRestaurants.length,
      restaurants: allRestaurants 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get MenuManager stats
app.get('/v1/restaurants/stats', async (req, res) => {
  try {
    const stats = menuManager.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
}