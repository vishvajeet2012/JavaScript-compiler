import styles from "./page.module.css";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Stats from "@/components/Stats";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <Hero />
        <hr className={styles.divider} />
        <Features />
        <hr className={styles.divider} />
        <Stats />
        <hr className={styles.divider} />
        <About />
        <hr className={styles.divider} />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
