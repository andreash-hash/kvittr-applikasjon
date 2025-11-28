const DownloadIcons = () => {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Kvittr App Icons</h1>
        <p className="text-center text-muted-foreground mb-12">
          Right-click on any icon below and select "Save image as..."
        </p>
        
        <div className="grid md:grid-cols-2 gap-12">
          {/* Light Version */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold mb-2">Light Version (for app stores)</h2>
            <img 
              src="/kvittr-icon-light.png" 
              alt="Kvittr App Icon - Light Version"
              className="w-[512px] h-[512px] rounded-3xl shadow-lg"
            />
            <p className="text-sm text-muted-foreground">1024x1024px - Beige background</p>
          </div>

          {/* Dark Version */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold mb-2">Dark Version (alternative)</h2>
            <img 
              src="/kvittr-icon-dark.png" 
              alt="Kvittr App Icon - Dark Version"
              className="w-[512px] h-[512px] rounded-3xl shadow-lg"
            />
            <p className="text-sm text-muted-foreground">1024x1024px - Navy background</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadIcons;
