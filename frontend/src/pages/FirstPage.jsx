import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "./Welcome.css";
import diyaImage from "../assets/diya final.png";
import { Phone, LockKeyhole } from "lucide-react";

function DiyaLogo({ small = false }) {
  return (
    <div className={`diya-logo ${small ? "small" : ""}`}>
      <img src={diyaImage} alt="Karigar Kart Diya" />
    </div>
  );
}

function Login() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const mobileRef = useRef(null);
  const otpRef = useRef(null);

  // Mobile number field gets focus automatically
  useEffect(() => {
    mobileRef.current?.focus();
  }, []);

  const handleContinue = () => {
    // STEP 1 → Move to OTP
    if (step === 1) {
      setStep(2);

      // Wait for React to update
      setTimeout(() => {
        otpRef.current?.focus();

        otpRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      return;
    }

    // STEP 2 → Go to next page
    if (step === 2) {
      navigate("/Signup");
    }
  };

  // Enter key handling
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <main className="auth-page">

      <button
        className="back-button"
        onClick={() => navigate("/")}
      >
        <span>←</span>
        Back
      </button>

      <section className="auth-card">

        <DiyaLogo />

        <h1>Create Account</h1>

        <p className="auth-subtitle">
          Join the Karigar Kart community
        </p>

        {/* Mobile Number */}
        <div className="input-group">

          <label>Mobile Number</label>

          <div className="input-wrapper">

            <Phone className="input-icon" size={20} />

            <input
              ref={mobileRef}
              type="tel"
              placeholder="Enter Your Mobile No."
              maxLength="10"
              onKeyDown={handleKeyDown}
            />

          </div>

        </div>


        {/* OTP */}
        <div className="input-group">

          <label>OTP</label>

          <div className="input-wrapper">

            <LockKeyhole
              className="input-icon"
              size={20}
            />

            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              placeholder="Enter your OTP"
              maxLength="4"
              onKeyDown={handleKeyDown}
            />

          </div>

        </div>


        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="auth-main-button"
        >
          Continue
        </button>


        {/* Divider */}
        <div className="or-divider">

          <span></span>

          <p>or continue with</p>

          <span></span>

        </div>


        {/* Google */}
        <button className="google-button">

          <span className="google-g">G</span>

          Continue with Google

        </button>


        {/* Login */}
        <p className="bottom-auth-text">

          Already have an account?

          <button
            onClick={() => navigate("/Login")}
          >
            Login
          </button>

        </p>

      </section>

    </main>
  );
}

export default Login;