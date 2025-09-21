"use client";

import type React from "react";
import styled from "styled-components";
import Link from "next/link";
import { useEffect, useRef, useState, Suspense } from "react";
import * as THREE from "three";

import { Button as UIButton } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Input as UIInput } from "@/components/ui/input";

import { Globe, Heart, Brain, ChevronDown, Mail } from "lucide-react";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Html, Sphere } from "@react-three/drei";

function InteractiveGlobe() {
  const globeRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (!globeRef.current) return;
    globeRef.current.scale.setScalar(hovered ? 1.05 : 1);
  });

  return (
    <group>
      <Sphere
        ref={globeRef}
        args={[2, 128, 128]}
        position={[0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshPhysicalMaterial
          color="#1e3a8a"
          roughness={0.3}
          metalness={0.1}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          transparent
          opacity={0.9}
          emissive="#0f172a"
          emissiveIntensity={0.1}
        />
        <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.1} />
      </Sphere>

      {/* Atmosphere */}
      <Sphere args={[2.1, 64, 64]} position={[0, 0, 0]}>
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.1} side={THREE.BackSide} />
      </Sphere>

      {/* Pins + labels */}
      <mesh position={[1.5, 0.8, 1.2]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[1.8, 0.8, 1.2]} style={{ pointerEvents: "none" }}>
        <Tooltip>Housing Crisis</Tooltip>
      </Html>

      <mesh position={[-1.2, 1.2, 1.5]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[-1.5, 1.2, 1.5]} style={{ pointerEvents: "none" }}>
        <Tooltip>Workplace Bias</Tooltip>
      </Html>

      <mesh position={[0.8, -1.5, 1.8]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[1.1, -1.5, 1.8]} style={{ pointerEvents: "none" }}>
        <Tooltip>Economic Hardship</Tooltip>
      </Html>

      <mesh position={[0, -2, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0, -2.3, 0]} style={{ pointerEvents: "none" }}>
        <Tooltip>Social Isolation</Tooltip>
      </Html>

      <mesh position={[0.2, 1.8, -1.5]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
      </mesh>
      <Html position={[0.2, 2.1, -1.5]} style={{ pointerEvents: "none" }}>
        <Tooltip>Healthcare Access</Tooltip>
      </Html>

      {/* Particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 6,
          ]}
        >
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function CinematicCamera() {
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setZoom(true), 2000);
    return () => clearTimeout(t);
  }, []);
  useFrame((state) => {
    state.camera.position.lerp(new THREE.Vector3(0, 0, zoom ? 4 : 8), 0.04);
  });
  return null;
}

const Page = styled.div`
  min-height: 100vh;
  color: #e2e8f0;
  background: #0f172a;
  overflow: hidden;
`;

const Header = styled.header`
  position: absolute;
  inset: 0 auto auto 0;
  right: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  background: rgba(15, 23, 42, 0.8);
`;

const HeaderInner = styled.div`
  max-width: 80rem;
  margin: 0 auto;
  padding: 1rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Brand = styled.div`
  display: flex; align-items: center; gap: .75rem;
  img { width: 120px; height: 40px; display: block; }
`;

const Nav = styled.nav`
  display: none;
  align-items: center;
  gap: 1.5rem;

  @media (min-width: 768px) {
    display: flex;
  }
`;

const NavLink = styled(Link)`
  color: #cbd5e1;
  text-decoration: none;
  font-weight: 600;
  transition: color .2s ease;
  &:hover { color: #fff; }
`;

const ContactBtn = styled(UIButton)`
  border: 1px solid rgba(255,255,255,.3);
  background: transparent;
  color: #e5e7eb;
  &:hover { background: rgba(255,255,255,.08); color: #fff; }
  display: inline-flex; align-items: center; gap: .5rem;
`;

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 50;
  display: grid; place-items: center;
  padding: 1rem;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(4px);
`;

const ContactCard = styled.div`
  width: 100%; max-width: 28rem;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 1rem;
  padding: 2rem;
`;

const ModalTitle = styled.h3`
  margin: 0 0 .5rem;
  font-size: 1.5rem; font-weight: 800; color: #f8fafc;
  text-align: center;
`;
const ModalLead = styled.p`
  margin: 0 0 1.25rem; color: #cbd5e1; text-align: center;
`;

const ErrorBox = styled.div`
  margin-bottom: 1rem;
  padding: .75rem;
  border-radius: .5rem;
  background: rgba(185,28,28,.25);
  border: 1px solid rgba(248,113,113,.5);
  color: #fecaca; font-size: .9rem;
`;

const InputsCol = styled.div`
  display: grid; gap: 1rem;
`;

const EmailInput = styled(UIInput)`
  background: #334155; border-color: #475569; color: #cbd5e1;
  &::placeholder { color: #94a3b8; }
`;

const MessageInput = styled.textarea`
  width: 100%; height: 6rem; resize: none;
  padding: .75rem;
  border-radius: .5rem;
  background: #334155; border: 1px solid #475569;
  color: #cbd5e1;
  outline: none;
  &:focus { box-shadow: 0 0 0 2px #3b82f6 inset; }
  &::placeholder { color: #94a3b8; }
`;

const ModalActions = styled.div`
  display: flex; gap: .75rem; margin-top: .25rem;
`;
const SendBtn = styled(UIButton)`
  flex: 1;
  background: linear-gradient(90deg,#2563eb,#7c3aed);
  color: #fff; border: none;
  &:hover { filter: brightness(1.05); }
`;
const CancelBtn = styled(UIButton)`
  border: 1px solid #334155;
  background: #0f172a; color: #cbd5e1;
  &:hover { background: #1f2937; color: #e5e7eb; }
`;

const Toast = styled.div<{ $bg: string; $bd: string; $fg: string }>`
  position: fixed; top: 6rem; left: 50%; transform: translateX(-50%);
  z-index: 50;
  padding: 1rem 2rem;
  border-radius: .9rem;
  box-shadow: 0 10px 30px rgba(0,0,0,.4);
  background: ${({ $bg }) => $bg};
  border: 2px solid ${({ $bd }) => $bd};
  color: ${({ $fg }) => $fg};
  display: flex; align-items: center; gap: .75rem;
`;

const Hero = styled.section`
  position: relative;
  height: 100vh;
  display: grid; place-items: center;
  background: #0f172a;
`;
const CanvasWrap = styled.div`
  position: absolute; inset: 0; z-index: 0;
`;
const HeroContent = styled.div`
  position: relative; z-index: 10;
  text-align: center;
  max-width: 48rem; margin: 0 auto; padding: 0 1rem;
`;
const Tag = styled(UIBadge)`
  margin-bottom: 1.25rem;
  background: rgba(59,130,246,.18);
  color: #93c5fd;
  border: 1px solid rgba(147,197,253,.3);
`;
const HeroText = styled.p`
  font-size: clamp(1.1rem, 2.2vw, 1.25rem);
  color: #e5e7eb; line-height: 1.8; margin: 0 0 1.25rem;
`;
const CTA = styled(UIButton)`
  font-size: 1.1rem; padding: .9rem 2rem;
  background: linear-gradient(90deg,#2563eb,#7c3aed);
  color: #fff; border: none;
  box-shadow: 0 18px 40px rgba(67,56,202,.35);
  transition: transform .2s ease, filter .2s ease;
  &:hover{ transform: scale(1.03); filter: brightness(1.05); }
`;

const ScrollHint = styled.button`
  position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%);
  z-index: 20; display: grid; gap: .25rem; place-items: center;
  border: none; background: transparent; cursor: pointer;
  color: #cbd5e1; font-size: .9rem;
`;

const Features = styled.section`
  padding: 5rem 1rem;
  background: #1e293b;
`;
const FeaturesInner = styled.div`
  max-width: 64rem; margin: 0 auto;
`;
const SectionHead = styled.div`
  text-align: center; margin-bottom: 3rem;
`;
const SectionTitle = styled.h3`
  margin: 0 0 .75rem;
  font-size: clamp(1.8rem, 3vw, 2.25rem);
  font-weight: 800;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #1e40af 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;
const SectionLead = styled.p`
  color: #cbd5e1; font-size: 1.1rem; margin: 0 auto; max-width: 40rem;
`;
const FeatureGrid = styled.div`
  display: grid; gap: 2rem; max-width: 64rem; margin: 0 auto;
  grid-template-columns: repeat(1,minmax(0,1fr));
  @media (min-width: 768px){ grid-template-columns: repeat(3,minmax(0,1fr)); }
`;
const FeatureCard = styled.div`
  text-align: center;
`;
const IconWrap = styled.div`
  width: 5rem; height: 5rem; margin: 0 auto 1rem;
  display: grid; place-items: center;
  border-radius: 1.25rem;
  border: 1px solid rgba(59,130,246,.25);
  background: linear-gradient(135deg, rgba(37,99,235,.28), rgba(99,102,241,.28));
  box-shadow: 0 18px 40px rgba(2,6,23,.45);
`;
const FeatureTitle = styled.h4`
  margin: .5rem 0  .5rem; color: #f8fafc; font-weight: 800; font-size: 1.125rem;
`;
const FeatureText = styled.p` color: #cbd5e1; `;

const Footer = styled.footer`
  border-top: 1px solid rgba(255,255,255,.1);
  backdrop-filter: blur(6px);
  padding: 3rem 1rem;
  background: rgba(15,23,42,.8);
`;
const FooterInner = styled.div` max-width: 64rem; margin: 0 auto; text-align: center; `;
const FooterBrand = styled.div` display: inline-grid; place-items: center; gap: .75rem; margin-bottom: 1.25rem; img{ width:120px; height:40px; } `;
const FooterText = styled.p` color: #cbd5e1; margin: 0; `;

const Tooltip = styled.div`
  padding: .25rem .5rem; border-radius: .375rem; font-size: .75rem;
  color: #fff; white-space: nowrap; background: rgba(0,0,0,.9);
`;

export default function HomePage() {
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const onScroll = () => setShowScrollIndicator(!(window.scrollY > window.innerHeight * 0.8));
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToFeatures = () => {
    document.querySelector("#features-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (email && message) {
        setShowSuccessMessage(true);
        setEmail(""); setMessage(""); setShowContactForm(false);
        setTimeout(() => setShowSuccessMessage(false), 4000);
      } else {
        setErrorMessage("Please fill in both email and message fields.");
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 4000);
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 4000);
    }
  };

  return (
    <Page>
      {/* Header */}
      <Header>
        <HeaderInner>
          <Brand>
            <img src="/logo.png" alt="Loop Logo" />
          </Brand>
          <Nav>
            <NavLink href="/scenarios">Explore</NavLink>
            <NavLink href="/progress">Journey</NavLink>
            <NavLink href="/about">About</NavLink>
            <ContactBtn size="sm" onClick={() => setShowContactForm((s) => !s)}>
              <Mail size={16} /> Contact Us
            </ContactBtn>
          </Nav>
        </HeaderInner>
      </Header>

      {/* Contact Modal */}
      {showContactForm && (
        <Overlay>
          <ContactCard>
            <ModalTitle>Contact Us</ModalTitle>
            <ModalLead>Get in touch to learn more about this research project.</ModalLead>

            {showErrorMessage && <ErrorBox>{errorMessage}</ErrorBox>}

            <form onSubmit={handleContactSubmit}>
              <InputsCol>
                <EmailInput
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <MessageInput
                  placeholder="Enter your message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
                <ModalActions>
                  <SendBtn type="submit">Send Message</SendBtn>
                  <CancelBtn type="button" variant="outline" onClick={() => setShowContactForm(false)}>
                    Cancel
                  </CancelBtn>
                </ModalActions>
              </InputsCol>
            </form>
          </ContactCard>
        </Overlay>
      )}

      {/* Toasts */}
      {showSuccessMessage && (
        <Toast $bg="#ecfdf5" $bd="#6ee7b7" $fg="#065f46">
          <Dot style={{ background: "#10b981" }} />
          <div>
            <strong>Message sent successfully!</strong>
            <div style={{ fontSize: ".9rem", color: "#047857" }}>We’ll get back to you soon.</div>
          </div>
        </Toast>
      )}
      {showErrorMessage && (
        <Toast $bg="#fef2f2" $bd="#fecaca" $fg="#991b1b">
          <Dot style={{ background: "#ef4444" }} />
          <div>
            <strong>Error</strong>
            <div style={{ fontSize: ".9rem", color: "#b91c1c" }}>{errorMessage}</div>
          </div>
        </Toast>
      )}

      {/* Globe */}
      <Hero>
        <CanvasWrap>
          <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
            <Suspense fallback={null}>
              <Environment preset="night" />
              <ambientLight intensity={0.3} />
              <pointLight position={[10, 10, 10]} intensity={0.8} color="#3b82f6" />
              <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
              <directionalLight position={[5, 5, 5]} intensity={0.4} color="#ffffff" />
              <InteractiveGlobe />
              <CinematicCamera />
              <OrbitControls
                enableZoom
                enablePan={false}
                minDistance={3}
                maxDistance={12}
                autoRotate={false}
                enableDamping
                dampingFactor={0.05}
                rotateSpeed={0.5}
              />
            </Suspense>
          </Canvas>
        </CanvasWrap>

        <HeroContent>
          <Tag>Free • Immersive • Transformative</Tag>
          <HeroText>
            Step into different worlds.
            <br />
            Experience the lives of different people through new eyes.
          </HeroText>
          <CTA asChild>
            <Link href="/avatar">Enter the Experience</Link>
          </CTA>
        </HeroContent>

        {showScrollIndicator && (
          <ScrollHint onClick={scrollToFeatures} aria-label="Scroll to explore">
            <span>Scroll to explore</span>
            <ChevronDown size={18} />
          </ScrollHint>
        )}
      </Hero>

      {/* Features */}
      <Features id="features-section">
        <FeaturesInner>
          <SectionHead>
            <SectionTitle>Immersive Learning</SectionTitle>
            <SectionLead>Every choice matters. Every story teaches. Every experience transforms.</SectionLead>
          </SectionHead>

          <FeatureGrid>
            <FeatureCard>
              <IconWrap><Globe size={32} color="#60a5fa" /></IconWrap>
              <FeatureTitle>Global Perspectives</FeatureTitle>
              <FeatureText>PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER.</FeatureText>
            </FeatureCard>

            <FeatureCard>
              <IconWrap><Brain size={32} color="#c4b5fd" /></IconWrap>
              <FeatureTitle>Meaningful Choices</FeatureTitle>
              <FeatureText>PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER.</FeatureText>
            </FeatureCard>

            <FeatureCard>
              <IconWrap><Heart size={32} color="#f472b6" /></IconWrap>
              <FeatureTitle>Empathy Building</FeatureTitle>
              <FeatureText>PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER PLACEHOLDER.</FeatureText>
            </FeatureCard>
          </FeatureGrid>
        </FeaturesInner>
      </Features>

      {/* Footer */}
      <Footer>
        <FooterInner>
          <FooterBrand>
            <img src="/logo.png" alt="Loop Logo" />
          </FooterBrand>
          <FooterText>Building empathy through immersive experiences</FooterText>
        </FooterInner>
      </Footer>
    </Page>
  );
}

const Dot = styled.div`
  width: .6rem; height: .6rem; border-radius: 9999px;
`;
