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

  // Automatically focus Mobile Number when page opens
  useEffect(() => {
    mobileRef.current?.focus();
  }, []);

  const handleLogin = () => {

    // First click / first Enter
    // Mobile Number → OTP
    if (step === 1) {
      setStep(2);

      setTimeout(() => {
        otpRef.current?.focus();

        otpRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      return;
    }

    // Second click / second Enter
    // Do nothing for now.
    // Backend developer will add login verification here.
    if (step === 2) {
      return;
    }
  };

  // Enter key works exactly like clicking Login
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
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

        <h1>Welcome Back</h1>

        <p className="auth-subtitle">
          Login to continue to Karigar Kart
        </p>


        {/* Mobile Number */}
        <div className="input-group">

          <label>Mobile Number</label>

          <div className="input-wrapper">

            <Phone
              className="input-icon"
              size={20}
            />

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


        {/* Login Button */}
        <button
          className="auth-main-button"
          onClick={handleLogin}
        >
          Login
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


        {/* Register */}
        <p className="bottom-auth-text">

          Don't have an account?

          <button
            onClick={() => navigate("/FirstPage")}
          >
            Register
          </button>

        </p>

      </section>

    </main>
  );
}

export default Login;