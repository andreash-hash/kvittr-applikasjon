import { useNavigate } from "react-router-dom";
import logoImage from "@/assets/kvittr-logo.png";

interface LogoProps {
  size?: "small" | "medium" | "large";
  clickable?: boolean;
  className?: string;
}

export const Logo = ({ size = "medium", clickable = false, className = "" }: LogoProps) => {
  const navigate = useNavigate();

  const sizeClasses = {
    small: "h-8 w-8",
    medium: "h-20 w-20",
    large: "h-[120px] w-[120px]",
  };

  const handleClick = () => {
    if (clickable) {
      navigate("/dashboard");
    }
  };

  return (
    <img
      src={logoImage}
      alt="Kvittr Logo"
      className={`${sizeClasses[size]} ${clickable ? "cursor-pointer" : ""} ${className}`}
      onClick={handleClick}
    />
  );
};
