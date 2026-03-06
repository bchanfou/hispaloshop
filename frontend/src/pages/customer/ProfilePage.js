import React, { useEffect, useState } from 'react';
import API_BASE_URL from '../../config/api';
import axios from 'axios';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

const API = API_BASE_URL;
const dietOptions = ['vegan', 'halal', 'kosher', 'gluten-free', 'sugar-free'];
const allergenOptions = ['nuts', 'dairy', 'eggs', 'soy', 'wheat', 'shellfish'];

export default function ProfilePage() {
  const [preferences, setPreferences] = useState({
    diet_preferences: [],
    allergens: [],
    goals: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API}/preferences`, { withCredentials: true });
      setPreferences(response.data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await axios.post(`${API}/preferences`, preferences, { withCredentials: true });
      toast.success('Preferences saved!');
    } catch (error) {
      toast.error('Failed to save preferences');
    }
  };

  const toggleDiet = (diet) => {
    setPreferences((prev) => ({
      ...prev,
      diet_preferences: prev.diet_preferences.includes(diet)
        ? prev.diet_preferences.filter((d) => d !== diet)
        : [...prev.diet_preferences, diet],
    }));
  };

  const toggleAllergen = (allergen) => {
    setPreferences((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter((a) => a !== allergen)
        : [...prev.allergens, allergen],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl font-bold text-text-primary mb-8" data-testid="profile-title">My Profile</h1>

        {loading ? (
          <p className="text-text-muted" data-testid="profile-loading">Loading preferences...</p>
        ) : (
          <div className="bg-white p-8 rounded-xl border border-stone-200 space-y-8">
            <div>
              <Label className="font-medium text-text-primary mb-4 block">Diet Preferences</Label>
              <div className="space-y-3">
                {dietOptions.map((diet) => (
                  <div key={diet} className="flex items-center space-x-2">
                    <Checkbox
                      id={diet}
                      checked={preferences.diet_preferences.includes(diet)}
                      onCheckedChange={() => toggleDiet(diet)}
                      data-testid={`diet-${diet}`}
                    />
                    <label htmlFor={diet} className="text-text-secondary capitalize cursor-pointer">{diet}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-medium text-text-primary mb-4 block">Allergens to Avoid</Label>
              <div className="space-y-3">
                {allergenOptions.map((allergen) => (
                  <div key={allergen} className="flex items-center space-x-2">
                    <Checkbox
                      id={allergen}
                      checked={preferences.allergens.includes(allergen)}
                      onCheckedChange={() => toggleAllergen(allergen)}
                      data-testid={`allergen-${allergen}`}
                    />
                    <label htmlFor={allergen} className="text-text-secondary capitalize cursor-pointer">{allergen}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="goals" className="font-medium text-text-primary mb-3 block">Goals</Label>
              <textarea
                id="goals"
                value={preferences.goals || ''}
                onChange={(e) => setPreferences({ ...preferences, goals: e.target.value })}
                className="w-full border border-stone-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                rows={4}
                placeholder="What are your dietary goals?"
                data-testid="goals-input"
              />
            </div>

            <Button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary-hover text-white rounded-full"
              data-testid="save-preferences-button"
            >
              Save Preferences
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
