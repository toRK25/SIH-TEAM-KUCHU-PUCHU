import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./Welcome.css";
import diyaImage from "../assets/diya final.png";

import {
  User,
  Palette,
  Search,
  MapPin
} from "lucide-react";

import {
  State,
  City
} from "country-state-city";

import Select from "react-select";


function DiyaLogo({ small = false }) {
  return (
    <div className={`diya-logo ${small ? "small" : ""}`}>
      <img src={diyaImage} alt="Karigar Kart Diya" />
    </div>
  );
}


function Signup() {

  const navigate = useNavigate();

  // Form states
  const [fullName, setFullName] = useState("");
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [artisan, setArtisan] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);


  // Get all Indian states
  const indianStates = State.getStatesOfCountry("IN");


  // Convert states into react-select format
  const stateOptions = indianStates.map((state) => ({
    value: state.isoCode,
    label: state.name
  }));


  // Get cities according to selected state
  const cityOptions = selectedState
    ? City.getCitiesOfState(
        "IN",
        selectedState.value
      ).map((city) => ({
        value: city.name,
        label: city.name
      }))
    : [];


  // When state changes
  const handleStateChange = (state) => {

    setSelectedState(state);

    // Reset city when state changes
    setSelectedCity(null);
  };


  // Create account
  const handleCreateAccount = () => {

    console.log("Full Name:", fullName);
    console.log("State:", selectedState?.label);
    console.log("City:", selectedCity?.label);
    console.log("Artisan:", artisan);

    // Backend developer can connect API here later
  };


  // Custom styling for React Select
  const selectStyles = {
  control: (base, state) => ({
    ...base,

    height: "62px",
    minHeight: "62px",

    borderRadius: "14px",

    border: state.isFocused
      ? "1px solid #b45b20"
      : "1px solid #d8d0c8",

    boxShadow: state.isFocused
      ? "0 0 0 3px rgba(180, 91, 32, 0.10)"
      : "none",

    fontSize: "18px",

    backgroundColor: "white",

    cursor: "pointer",

    "&:hover": {
      border: "1px solid #b45b20"
    }
  }),

  placeholder: (base) => ({
    ...base,
    color: "#999"
  }),

  singleValue: (base) => ({
    ...base,
    color: "#222"
  })
};


  return (
    <main className="auth-page signup-page">

      {/* Back */}
      <button
        className="back-button"
        onClick={() => navigate("/")}
      >
        <span>←</span>
        Back
      </button>


      <section className="auth-card signup-card">

        <DiyaLogo />


        <h1>Create Account</h1>


        <p className="auth-subtitle">
          Join the Karigar Kart community
        </p>


        {/* ================= FULL NAME ================= */}

        <div className="input-group">

          <label>Full Name</label>

          <div className="input-wrapper">

            <User
              className="input-icon"
              size={20}
            />

            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value)
              }
            />

          </div>

        </div>


        {/* ================= STATE ================= */}

        {/* State */}
        <div className="input-group">

          <label>State</label>

          <div className="location-input-wrapper">

            <Search
              className="input-icon"
              size={20}
            />
        
            <Select
              options={stateOptions}
              value={selectedState}
              onChange={handleStateChange}
              placeholder="Search your state"
              isSearchable={true}
              isClearable={true}
              styles={selectStyles}
              className="location-select"
              classNamePrefix="location"
            />

          </div>

        </div>


        {/* ================= CITY ================= */}

        {/* City */}
        <div className="input-group">

          <label>City</label>

          <div className="location-input-wrapper">
        
            <MapPin
              className="input-icon"
              size={20}
            />

            <Select
              options={cityOptions}
              value={selectedCity}
              onChange={setSelectedCity}
              placeholder={
                selectedState
                  ? "Search your city"
                  : "Select state first"
              }
              isSearchable={true}
              isClearable={true}
              isDisabled={!selectedState}
              styles={selectStyles}
              className="location-select"
              classNamePrefix="location"
            />

          </div>

        </div>


        {/* ================= ARTISAN ================= */}

        <div className="input-group">

          <label>Artisan</label>

          <div className="input-wrapper">

            <Palette
              className="input-icon"
              size={20}
            />

            <input
              type="text"
              placeholder="Type of Artisan"
              value={artisan}
              onChange={(e) =>
                setArtisan(e.target.value)
              }
            />

          </div>

        </div>


        {/* ================= TERMS ================= */}

        <label className="terms">

          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) =>
              setTermsAccepted(e.target.checked)
            }
          />

          <span>
            I agree to the Terms & Conditions
          </span>

        </label>


        {/* ================= CREATE ACCOUNT ================= */}

        <button
          className="auth-main-button"
          onClick={handleCreateAccount}
        >
          Create Account
        </button>


        {/* ================= LOGIN ================= */}

        <p className="bottom-auth-text">

          Already have an account?

          <button
            onClick={() => navigate("/login")}
          >
            Login
          </button>

        </p>

      </section>

    </main>
  );
}


export default Signup;