import { useState, type FormEvent } from "react";
import PageShell from "@/components/PageShell";

const options = [
  "Incorrect information",
  "Worker no longer available",
  "Inappropriate information",
  "Other",
];

export default function Report() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: formData.get("reason"),
          feedback: formData.get("feedback"),
        }),
      });

      if (!response.ok) {
        throw new Error(
          "Unable to submit your feedback right now. Please try again.",
        );
      }

      setSubmitted(true);
      form.reset();
    } catch {
      setError("Unable to submit your feedback right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell backTo="/search" backLabel="Back">
      <section className="rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-gradient-to-br from-[#FFF4EF] via-[#FAF8F5] to-[#F5EAE2] dark:from-[#261B16] dark:via-[#1C1512] dark:to-[#15110F] px-6 py-7 sm:px-8 sm:py-9 shadow-sm">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4512C]">
          Community Trust
        </span>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-[#141210] dark:text-[#FAFAFA]">
          Report or Give Feedback
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6B645F] dark:text-[#9E958F]">
          Help us keep Builderco accurate, safe, and useful for everyone.
        </p>
      </section>

      {submitted ? (
        <section className="mt-6 rounded-[24px] border border-[#0F8A73]/30 bg-[#0F8A73]/10 p-6 text-center shadow-sm">
          <h2 className="text-base font-extrabold text-[#141210] dark:text-[#FAFAFA]">
            Thank you. Your feedback has been submitted.
          </h2>
          <p className="mt-1 text-xs font-medium text-[#6B645F] dark:text-[#9E958F]">
            Our moderation team reviews reports carefully to maintain verified listings.
          </p>
        </section>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-[24px] border border-[#EAE2DC] dark:border-white/10 bg-white dark:bg-[#161514] p-5 shadow-sm sm:p-7"
        >
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F]">
              What would you like to report?
            </legend>
            <div className="mt-3.5 space-y-2.5">
              {options.map((option) => (
                <label
                  key={option}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 text-sm font-medium text-[#141210] dark:text-[#FAFAFA] hover:border-[#F4512C]/40 transition"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={option}
                    required
                    className="h-4 w-4 accent-[#F4512C]"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
          <label
            htmlFor="feedback"
            className="mt-6 block text-xs font-bold uppercase tracking-wider text-[#6B645F] dark:text-[#9E958F]"
          >
            Additional details
          </label>
          <textarea
            id="feedback"
            name="feedback"
            required
            rows={5}
            placeholder="Tell us what happened..."
            className="mt-2 w-full resize-none rounded-xl border border-[#EAE2DC] dark:border-white/10 bg-[#FAF8F5] dark:bg-[#0B0A09] px-3.5 py-3 text-sm text-[#141210] dark:text-[#FAFAFA] outline-none placeholder:text-[#6B645F]/70 focus:border-[#F4512C] transition"
          />
          {error ? (
            <p className="mt-4 text-xs font-bold text-rose-600 dark:text-rose-400">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-[#F4512C] text-sm font-bold text-white shadow-sm transition hover:bg-[#E04320] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4512C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer active:scale-[0.99]"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}
    </PageShell>
  );
}
