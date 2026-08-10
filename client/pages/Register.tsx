import { useState, type FormEvent } from "react";
import PageShell from "@/components/PageShell";

const fields = [
  ["fullName", "Full Name", "e.g. Ravi Kumar"],
  ["phone", "Phone Number", "Your phone number"],
  ["category", "Work Category", "e.g. Electrician"],
  ["location", "Location", "Your town or locality"],
  ["experience", "Years of Experience", "e.g. 5 years"],
  ["services", "Services Offered", "e.g. Wiring, repairs"],
] as const;

export default function Register() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageShell>
      <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 sm:px-8 sm:py-9">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.045em] text-navy sm:text-4xl">Register as a Worker</h1>
        <p className="mt-3 text-[14px] leading-6 text-slate">Tell people nearby what kind of work you can help with.</p>
      </section>

      {submitted ? (
        <section className="mt-6 rounded-[13px] border border-[#b9ddd4] bg-mint p-5 text-center">
          <h2 className="font-extrabold text-navy">Your registration has been submitted.</h2>
          <p className="mt-2 text-[14px] text-slate">Thank you for sharing your details.</p>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 space-y-4 rounded-[13px] border border-line bg-white p-5 shadow-[0_5px_18px_rgba(24,55,62,0.04)] sm:p-7">
          {fields.map(([id, label, placeholder]) => (
            <div key={id}>
              <label htmlFor={id} className="mb-2 block text-[13px] font-bold text-navy">{label}</label>
              <input id={id} name={id} required placeholder={placeholder} className="h-11 w-full rounded-[9px] border border-line bg-[#fbfcfc] px-3 text-sm text-navy outline-none placeholder:text-slate/80 focus:border-teal focus:ring-2 focus:ring-teal/15" />
            </div>
          ))}
          <div>
            <label htmlFor="about" className="mb-2 block text-[13px] font-bold text-navy">About You</label>
            <textarea id="about" name="about" required placeholder="A short introduction" rows={4} className="w-full resize-none rounded-[9px] border border-line bg-[#fbfcfc] px-3 py-3 text-sm text-navy outline-none placeholder:text-slate/80 focus:border-teal focus:ring-2 focus:ring-teal/15" />
          </div>
          <button type="submit" className="flex h-12 w-full items-center justify-center rounded-[10px] bg-navy text-sm font-bold text-white shadow-[0_5px_12px_rgba(18,63,75,0.18)] transition-colors hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">Register as a Worker</button>
        </form>
      )}
    </PageShell>
  );
}
