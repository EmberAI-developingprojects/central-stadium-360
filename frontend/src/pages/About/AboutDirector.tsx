import { useEffect } from "react";
import AboutIntro from "./AboutIntro";

export default function AboutDirector() {
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = document.getElementById("director");
      if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, []);
  return <AboutIntro />;
}
