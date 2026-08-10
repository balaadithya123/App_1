export type Worker = {
  id: string;
  name: string;
  category: string;
  locality: string;
  experience: string;
  initials: string;
  tone: string;
  about: string;
  services: string[];
};

export const staticWorkers: Worker[] = [
  { id: "ravi-kumar", name: "Ravi Kumar", category: "Electrician", locality: "Chidambaram", experience: "8 years", initials: "RK", tone: "bg-[#dcefe9]", about: "Reliable local electrician helping homes and small businesses with everyday electrical work.", services: ["Wiring and rewiring", "Fan and light installation", "Electrical repairs"] },
  { id: "suresh", name: "Suresh", category: "Electrician", locality: "Cuddalore", experience: "6 years", initials: "S", tone: "bg-[#f1e9d9]", about: "Friendly electrician for safe, practical home electrical work.", services: ["Home wiring", "Switch repairs", "Light installation"] },
  { id: "arun", name: "Arun", category: "Painter", locality: "Chidambaram", experience: "7 years", initials: "A", tone: "bg-[#f5f1f8]", about: "Careful painter focused on neat finishes for homes and small spaces.", services: ["Interior painting", "Wall touch-ups", "Color finishing"] },
  { id: "mani", name: "Mani", category: "Painter", locality: "Cuddalore", experience: "4 years", initials: "M", tone: "bg-[#e9f0f5]", about: "Local painting help for simple refreshes and new room finishes.", services: ["Interior walls", "Exterior painting", "Door painting"] },
  { id: "kumar", name: "Kumar", category: "Plumber", locality: "Nearby", experience: "5 years", initials: "K", tone: "bg-[#e5edf4]", about: "Dependable plumber for everyday leaks, fittings, and home repairs.", services: ["Leak repairs", "Tap installation", "Pipe repairs"] },
  { id: "raj", name: "Raj", category: "Plumber", locality: "Chidambaram", experience: "9 years", initials: "R", tone: "bg-[#e8f3ed]", about: "Experienced local plumber for practical household plumbing work.", services: ["Bathroom fittings", "Drain repairs", "Water connections"] },
  { id: "selvam", name: "Selvam", category: "Carpenter", locality: "Cuddalore", experience: "10 years", initials: "S", tone: "bg-[#f8f5ed]", about: "Skilled carpenter creating sturdy repairs and useful home furniture.", services: ["Furniture repairs", "Door adjustments", "Shelving"] },
  { id: "babu", name: "Babu", category: "Carpenter", locality: "Nearby", experience: "6 years", initials: "B", tone: "bg-[#f1eee5]", about: "Local carpenter for careful woodwork and small household projects.", services: ["Wood repairs", "Cabinet work", "Custom shelves"] },
  { id: "priya", name: "Priya", category: "Cleaner", locality: "Chidambaram", experience: "5 years", initials: "P", tone: "bg-[#eef6f7]", about: "Thorough local cleaner helping keep homes fresh and comfortable.", services: ["Home cleaning", "Kitchen cleaning", "Move-in cleaning"] },
  { id: "meena", name: "Meena", category: "Cleaner", locality: "Cuddalore", experience: "3 years", initials: "M", tone: "bg-[#eaf4ef]", about: "Friendly cleaner for regular home care and tidy spaces.", services: ["Regular cleaning", "Bathroom cleaning", "Dusting and mopping"] },
  { id: "gopal", name: "Gopal", category: "Other", locality: "Nearby", experience: "6 years", initials: "G", tone: "bg-[#f5f6f4]", about: "A helpful local worker for small household tasks and repairs.", services: ["Small repairs", "Assembly help", "General household work"] },
];
