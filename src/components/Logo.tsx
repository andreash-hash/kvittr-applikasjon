import { useNavigate } from "react-router-dom";

interface LogoProps {
  size?: "small" | "medium" | "large";
  clickable?: boolean;
  className?: string;
}

export const Logo = ({ size = "medium", clickable = false, className = "" }: LogoProps) => {
  const navigate = useNavigate();

  const sizeClasses = {
    small: "text-[24px]",
    medium: "text-[40px]",
    large: "text-[48px]",
  };

  const handleClick = () => {
    if (clickable) {
      navigate("/dashboard");
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`
        ${sizeClasses[size]} 
        ${clickable ? "cursor-pointer" : ""} 
        ${className}
        font-inter font-extrabold
        bg-gradient-to-r from-logo-dark via-logo-coral via-logo-orange via-logo-blue to-logo-teal
        bg-clip-text text-transparent
        inline-block
        select-none
      `}
      style={{
        backgroundImage: "linear-gradient(90deg, hsl(var(--logo-dark)) 0%, hsl(var(--logo-coral)) 25%, hsl(var(--logo-orange)) 50%, hsl(var(--logo-blue)) 75%, hsl(var(--logo-teal)) 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      kvittr
    </span>
  );
};
