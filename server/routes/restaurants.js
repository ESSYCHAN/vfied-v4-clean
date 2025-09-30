import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

      // Determine tier (import menuManager to get count)
      const currentCount = 0; // TODO: Get from menuManager.getRestaurantCount()
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
      const profilesPath = path.resolve(__dirname, '../../data/restaurant_profiles.json');
      let profiles = {};
      
      try {
        const data = await fs.readFile(profilesPath, 'utf8');
        profiles = JSON.parse(data);
      } catch (err) {
        console.log('Creating new restaurant_profiles.json');
      }
      
      profiles[restaurant_id] = restaurantProfile;
      await fs.writeFile(profilesPath, JSON.stringify(profiles, null, 2));

      console.log(`✅ Restaurant signup: ${restaurant_name} (tier: ${tier})`);

      const messages = {
        white_glove: 'As one of our first 20 partners, you\'ll get personalized onboarding. We\'ll email you within 24 hours.',
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
}