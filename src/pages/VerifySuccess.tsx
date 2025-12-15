import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";

const VerifySuccess = () => {
  const navigate = useNavigate();

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleOpenApp = () => {
    if (isMobile) {
      // Try to open app with deep link
      const deepLink = "kvittr://";
      const timeout = setTimeout(() => {
        // If app didn't open, redirect to login
        toast.info("Åpne Kvittr-appen manuelt og logg inn");
        navigate("/login");
      }, 1500);

      window.location.href = deepLink;

      // Clear timeout if page is hidden (app opened)
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          clearTimeout(timeout);
        }
      }, { once: true });
    } else {
      // Desktop: redirect to login
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center space-y-8">
        <Logo size="large" />

        <div className="flex flex-col items-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            E-post bekreftet!
          </h1>

          <p className="text-muted-foreground text-base leading-relaxed">
            Din e-postadresse er nå verifisert.
            <br />
            Du kan nå logge inn i Kvittr-appen.
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button
            onClick={handleOpenApp}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            Åpne appen
          </Button>

          <Button
            onClick={() => navigate("/login")}
            variant="outline"
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            Logg inn på nett
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VerifySuccess;
