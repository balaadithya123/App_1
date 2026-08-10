import { useState, type FormEvent } from "react";
import PageShell from "@/components/PageShell";

const options = ["Incorrect information", "Worker no longer available", "Inappropriate information", "Other"];

export default function Report() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <PageShell backTo="/worker" backLabel="Worker profile">
      <section className="rounded-[16px] border border-[#dcece7] bg-[#edf7f3] px-5 py-7 sm:px-8 sm:py-9">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.045em] text-navy sm:text-4xl">Report or Give Feedback</h1>
        <p className="mt-3 text-[14px] leading-6 text-slate">Help us keep LocalWorker useful for everyone.</p>
      </section>

      {submitted ? (
        <section className="mt-6 rounded-[13px] border border-[#b9ddd4] bg-mint p-5 text-center">
          <h2 className="font-extrabold text-navy">Thank you. Your feedback has been submitted.</h2>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 rounded-[13px] border border-line bg-white p-5 shadow-[0_5px_18px_rgba(24,55,62,0.04)] sm:p-7">
          <fieldset>
            <legend className="text-[13px] font-bold text-navy">What would you like to report?</legend>
            <div className="mt-4 space-y-3">
              {options.map((option) => (
                <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[9px] border border-line px-3 text-[13px] text-navy hover:bg-mint/50">
                  <input type="radio" name="reason" value={option} required className="h-4 w-4 accent-[#168b83]" />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="feedback" className="mt-6 block text-[13px] font-bold text-navy">Additional details</label>
          <textarea id="feedback" required rows={5} placeholder="Tell us what happened..." className="mt-2 w-full resize-none rounded-[9px] border border-line bg-[#fbfcfc] px-3 py-3 text-sm text-navy outline-none placeholder:text-slate/80 focus:border-teal focus:ring-2 focus:ring-teal/15" />
          <button type="submit" className="mt-5 flex h-12 w-full items-center justify-center rounded-[10px] bg-navy text-sm font-bold text-white shadow-[0_5px_12px_rgba(18,63,75,0.18)] transition-colors hover:bg-[#234b59] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">Submit</button>
        </form>
      )}
    </PageShell>
  );
}
