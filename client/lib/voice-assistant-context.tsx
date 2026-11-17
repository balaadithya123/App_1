import React, { createContext, useContext, useState } from "react";

interface VoiceAssistantContextValue {
  isOpen: boolean;
  autoStart: boolean;
  openCall: (startImmediately?: boolean) => void;
  closeCall: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextValue | null>(
  null,
);

export function VoiceAssistantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoStart, setAutoStart] = useState(true);

  const openCall = (startImmediately = true) => {
    setAutoStart(startImmediately);
    setIsOpen(true);
  };

  const closeCall = () => {
    setIsOpen(false);
  };

  return (
    <VoiceAssistantContext.Provider
      value={{ isOpen, autoStart, openCall, closeCall }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistant() {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) {
    throw new Error(
      "useVoiceAssistant must be used within a VoiceAssistantProvider",
    );
  }
  return ctx;
}
