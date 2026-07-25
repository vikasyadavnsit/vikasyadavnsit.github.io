import { Heart, Stars, MapPin, Camera, Music, Sparkles, Coffee, Plane, Home, Baby, BellRing } from "lucide-react";

export interface Memory {
  date: string;
  title: string;
  description: string;
  location?: string;
  icon: any;
}

export interface Reason {
  id: number;
  title: string;
  text: string;
  emoji: string;
}

export interface GalleryImage {
  url: string;
  caption: string;
}

export interface Letter {
  title: string;
  paragraphs: string[];
  signature: string;
}

export const STORY_CONFIG = {
  hero: {
    title: "Our Eternal Journey",
    subtitle: "The love story of Vikas & Shweta — written in every heartbeat, every laugh, and every quiet moment shared.",
    buttonText: "Begin Our Story",
  },
  timeline: [
    {
      date: "The Day We Met",
      title: "The Spark",
      description: "It started with a simple hello, but little did I know that my whole world was about to change. I still remember the way you smiled.",
      location: "First Meeting Spot",
      icon: Sparkles,
    },
    {
      date: "First Date",
      title: "Unforgettable Evening",
      description: "Talking for hours over coffee, feeling like we'd known each other for lifetimes. The connection was instant and undeniable.",
      location: "Favorite Cafe",
      icon: Coffee,
    },
    {
      date: "The First 'I Love You'",
      title: "Three Words, One Heart",
      description: "The moment the world stood still and everything finally made sense. Hearing those words from you was the best moment of my life.",
      icon: Heart,
    },
    {
      date: "Our First Trip",
      title: "Exploring Together",
      description: "Traveling to new places, getting lost, and finding ourselves in each other's company. Every mile brought us closer.",
      location: "Beach Destination",
      icon: Plane,
    },
    {
      date: "Moving In Together",
      title: "Building Our Sanctuary",
      description: "Turning a house into a home, filled with our shared dreams, messy kitchens, and endless late-night conversations.",
      icon: Home,
    },
    {
      date: "The Proposal",
      title: "A Promise of Forever",
      description: "Getting down on one knee, my heart racing, and seeing the joy in your eyes as you said the most important 'Yes'.",
      icon: BellRing,
    }
  ] as Memory[],
  reasons: [
    { id: 1, title: "Your Kindness",      text: "Your incredible kindness that inspires me every day to be a better person.", emoji: "✨" },
    { id: 2, title: "That Sparkle",       text: "The way your eyes sparkle when you're truly happy or laughing at my silly jokes.", emoji: "👁️" },
    { id: 3, title: "My Safe Place",      text: "Your unwavering support in everything I do, even when things get tough.", emoji: "🛡️" },
    { id: 4, title: "Pure Magic",         text: "How you make even the simplest moments — like a quiet rainy evening — feel magical.", emoji: "🪄" },
    { id: 5, title: "Two Halves, One Soul", text: "Your beautiful soul that matches perfectly with mine, like two halves of a whole.", emoji: "💖" },
    { id: 6, title: "Endless Love",       text: "The way you care for the people around you with so much selfless love.", emoji: "🌟" },
    { id: 7, title: "Holding On",         text: "How your hand feels perfectly nestled in mine when we walk together.", emoji: "🤝" },
    { id: 8, title: "My Anchor",          text: "Your strength and resilience that I admire more than words can say.", emoji: "⚓" },
  ] as Reason[],
  gallery: [
    { url: "/assets/images/eternal-journey/moment-1.jpeg", caption: "Where every glance tells a love story." },
    { url: "/assets/images/eternal-journey/moment-2.jpeg", caption: "Hand in hand, heart in heart — always." },
    { url: "/assets/images/eternal-journey/moment-3.jpeg", caption: "You lift me up in every way possible." },
    { url: "/assets/images/eternal-journey/moment-4.jpeg", caption: "Under city lights, it's only ever been us." },
  ] as GalleryImage[],
  letter: {
    title: "My dearest Shweta,",
    paragraphs: [
      "Writing this to you feels like trying to capture moonlight in a jar — because no matter how carefully I choose my words, they always fall short of what my heart truly holds for you.",
      "Every single day with you is a gift I never knew I deserved. You are the calm in my chaos, the warmth on my coldest mornings, and the kind of laughter that turns even the most ordinary moments into something I never want to forget.",
      "I promise to stand beside you through every season of life — to hold your hand when the road gets hard, to celebrate every small victory, and to choose you again and again, without hesitation, endlessly.",
      "You are my home, my peace, and the greatest adventure I have ever known. You are, and will always be, my one.",
    ],
    signature: "Forever yours, Vikas"
  } as Letter,
  proposal: {
    question: "Shweta, will you walk with me through all the tomorrows?",
    yesText: "Yes, Forever & Always!",
    noText: "No",
  }
};
