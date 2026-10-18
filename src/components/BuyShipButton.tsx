import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useStripe } from "@/hooks/useStripe";
import { trackEvent } from "@/lib/analytics";

interface BuyShipButtonProps {
  // The page the buyer is on. Stripe sends them back to it, and a signed-out buyer comes back to it after
  // logging in, with ?buy=ship so the payment starts by itself.
  returnPath: string;
  children: React.ReactNode;
  className?: string;
}

// The way into the paid plan from the page where the need appeared: no detour through the pricing page.
export const BuyShipButton = ({ returnPath, children, className = "" }: BuyShipButtonProps) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { checkout, loading, error } = useStripe();
  const started = useRef(false);

  const start = () => {
    trackEvent("CTA Clicked", { location: "upgrade", action: user ? "checkout" : "login_first" });
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`${returnPath}?buy=ship`)}`);
      return;
    }
    void checkout("ship", returnPath);
  };

  // Back from logging in with the intent still in the address: finish what the buyer started.
  useEffect(() => {
    if (authLoading || !user || started.current || params.get("buy") !== "ship") return;
    started.current = true;
    const rest = new URLSearchParams(params);
    rest.delete("buy");
    setParams(rest, { replace: true });
    void checkout("ship", returnPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the buyer is known
  }, [authLoading, user]);

  return (
    <div>
      <Button size="lg" onClick={start} disabled={loading} className={`gap-2 bg-green-700 hover:bg-green-800 text-white ${className}`}>
        {loading && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
        {children}
      </Button>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
};
