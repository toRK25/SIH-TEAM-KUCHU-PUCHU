import { supabase } from './lib/supabase';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Phone, LockKey, User, Palette, MapPin } from '@phosphor-icons/react';

type AuthProps = {
  go: (page: string) => void;
  tab: (page: string) => void;
  tell: (message: string) => void;
};

function DiyaLogo() {
  return (
    <div className="legacy-diya-logo">
      <img src="/assets/diya-final.png" alt="Karigar Kart Diya" />
    </div>
  );
}

export function LegacyWelcome({ go }: AuthProps) {
  return (
    <main className="legacy-auth-page legacy-welcome-page">
      <div className="legacy-soft-glow" />

      <section className="legacy-welcome-logo">
        <DiyaLogo />
        <h1><span>KARIGAR</span> KART</h1>

        <div className="legacy-brand-divider">
          <span />
          <b>◆</b>
          <span />
        </div>

        <p className="legacy-brand-tagline">
          HANDMADE. TRUSTED. DELIVERED.
        </p>
      </section>

      <section className="legacy-welcome-description">
        <p>Show your craftsmanship to the world</p>
      </section>

      <button
        className="legacy-get-started-btn"
        onClick={() => go('Sign Up')}
      >
        <span>Get Started</span>
        <span className="legacy-button-arrow"><ArrowRight size={28} /></span>
      </button>

      <section className="legacy-welcome-login">
        <div className="legacy-tiny-decoration">
          <span /><b>◆</b><span />
        </div>
        <p>Already have an account?</p>
        <button
          onClick={() => go('Login')}
          className="legacy-welcome-login-btn"
        >
          Login
        </button>
      </section>
    </main>
  );
}

export function LegacyAuth({ page, go, tab }: AuthProps & { page: 'Login' | 'Sign Up' }) {
  const isLogin = page === 'Login';

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');
  const [artisan, setArtisan] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState('');

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
    'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const citiesByState: Record<string, string[]> = {
    'Delhi': ['New Delhi', 'Delhi'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
    'Uttar Pradesh': ['Lucknow', 'Noida', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
    'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Tirupati', 'Guntur'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur'],
    'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Hisar'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg'],
    'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama'],
    'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Mandi', 'Solan'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Haldwani'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag'],
    'Puducherry': ['Puducherry'],
  };

  // const handleSubmit = () => {
  //   if (!/^\d{10}$/.test(mobile)) {
  //     setError('Please enter a valid 10-digit mobile number.');
  //     return;
  //   }

  //   if (!otpSent) {
  //     setOtpSent(true);
  //     setError('');
  //     return;
  //   }

  //   if (!/^\d{6}$/.test(otp)) {
  //     setError('Please enter the 6-digit OTP.');
  //     return;
  //   }

  //   if (!isLogin && (!fullName.trim() || !termsAccepted)) {
  //     setError('Please enter your name and accept Terms & Conditions.');
  //     return;
  //   }

  //   tab('Home');
  // };
  const handleSubmit = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!otpSent) {
      setOtpSent(true);
      setError('');
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    if (!isLogin && (!fullName.trim() || !termsAccepted)) {
      setError('Please enter your name and accept Terms & Conditions.');
      return;
    }

    try {
      if (!isLogin) {
        // 1. Insert into profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              name: fullName,
              role: artisan ? `Artisan (${artisan})` : 'Artisan',
              language: 'English',
            },
          ])
          .select();

        if (profileError) {
          console.error('Error creating profile:', profileError.message);
          setError('Failed to create profile: ' + profileError.message);
          return;
        }

        const newProfile = profileData[0];

        // 2. Insert into artisans table
        if (newProfile?.id) {
          const { error: artisanError } = await supabase.from('artisans').insert([
            {
              profile_id: newProfile.id,
              craft_type: artisan || 'General Craft',
              region: `${city ? city + ', ' : ''}${stateName}`,
            },
          ]);

          if (artisanError) {
            console.error('Error creating artisan entry:', artisanError.message);
          }
        }
      }

      // Proceed to main home view after successful saving
      tab('Home');
    } catch (err: any) {
      console.error('Auth submit error:', err);
      setError('Unexpected error: ' + err.message);
    }
  };
// it ends here

  return (
    <main className="legacy-auth-page legacy-form-page">
      <button
        className="legacy-back-button"
        onClick={() => go('Welcome')}
      >
        <ArrowLeft size={22} />
        <span>Back</span>
      </button>

      <section className={`legacy-auth-card ${!isLogin ? 'legacy-signup-card' : ''}`}>
        <DiyaLogo />

        <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="legacy-auth-subtitle">
          {isLogin
            ? 'Login to continue to Karigar Kart'
            : 'Join the Karigar Kart community'}
        </p>

        {!isLogin && (
          <>
            <div className="legacy-input-group">
              <label>Full Name</label>
              <div className="legacy-input-wrapper">
                <User size={20} className="legacy-input-icon" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="legacy-input-group">
              <label>State</label>
              <div className="legacy-input-wrapper">
                <MapPin size={20} className="legacy-input-icon" />
                <input
                  type="text"
                  list="karigar-states"
                  placeholder="Enter your state"
                  value={stateName}
                  onChange={(e) => {
                    setStateName(e.target.value);
                    setCity('');
                  }}
                />
                <datalist id="karigar-states">
                  {states.map((state) => <option key={state} value={state} />)}
                </datalist>
              </div>
            </div>

            <div className="legacy-input-group">
              <label>City</label>
              <div className="legacy-input-wrapper">
                <MapPin size={20} className="legacy-input-icon" />
                <input
                  type="text"
                  list="karigar-cities"
                  placeholder="Enter your city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <datalist id="karigar-cities">
                  {(citiesByState[stateName] || []).map((cityName) => <option key={cityName} value={cityName} />)}
                </datalist>
              </div>
            </div>

            <div className="legacy-input-group">
              <label>Type of Artisan</label>
              <div className="legacy-input-wrapper">
                <Palette size={20} className="legacy-input-icon" />
                <input
                  type="text"
                  placeholder="Type of Artisan"
                  value={artisan}
                  onChange={(e) => setArtisan(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <div className="legacy-input-group">
          <label>Mobile Number</label>
          <div className="legacy-input-wrapper">
            <Phone size={20} className="legacy-input-icon" />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="Enter Your Mobile No."
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
        </div>

        {otpSent && (
          <div className="legacy-input-group">
            <label>OTP</label>
            <div className="legacy-input-wrapper">
              <LockKey size={20} className="legacy-input-icon" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter your OTP"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>
          </div>
        )}

        {!isLogin && otpSent && (
          <label className="legacy-terms">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>I agree to the Terms & Conditions</span>
          </label>
        )}

        {error && <p className="legacy-error">{error}</p>}

        <button className="legacy-auth-main-button" onClick={handleSubmit}>
          {otpSent ? (isLogin ? 'Login' : 'Create Account') : 'Send OTP'}
        </button>

        <p className="legacy-demo-note">
          Mobile OTP is currently a demo. Real SMS verification will be connected with the backend.
        </p>

        <p className="legacy-bottom-auth-text">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => go(isLogin ? 'Sign Up' : 'Login')}>
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </section>
    </main>
  );
}
