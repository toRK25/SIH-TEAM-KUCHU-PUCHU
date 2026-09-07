import { useNavigate } from "react-router-dom";
import "./Welcome.css";
import diyaImage from "../assets/diya final.png";

function DiyaLogo({ small = false }) {
  return (
    <div className={`diya-logo ${small ? "small" : ""}`}>
      <img src={diyaImage} alt="Karigar Kart Diya" />
    </div>
  );
}



function Welcome() {
  const navigate = useNavigate();

  return (
    <main className="welcome-page">

      {/* Decorative background */}
      <div className="soft-glow"></div>

      {/* Main Logo */}
      <section className="welcome-logo">

        <DiyaLogo />

        <h1>
          <span>KARIGAR</span> KART
        </h1>

        <div className="brand-divider">
          <span></span>
          <b>◆</b>
          <span></span>
        </div>

        <p className="brand-tagline">
          HANDMADE. TRUSTED. DELIVERED.
        </p>

      </section>


      {/* Description */}
      <section className="welcome-description">

        <p>Show your craftsmanship to the world</p>

      </section>



      {/* Get Started */}
      <button
        className="get-started-btn"
        onClick={() => navigate("/FirstPage")}
      >
        <span>Get Started</span>
        <span className="button-arrow">→</span>
      </button>


      {/* Login */}
      <section className="welcome-login">

        <div className="tiny-decoration">
          <span></span>
          <b>◆</b>
          <span></span>
        </div>

        <p>Already have an account?</p>

        <button
          onClick={() => navigate("/login")}
          className="welcome-login-btn"
        >
          Login
        </button>

      </section>

    </main>
  );
}

export default Welcome;