const IconGenerator = () => {
  const iconStyle = {
    width: '1024px',
    height: '1024px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '230px',
  };

  const textStyle = {
    fontSize: '180px',
    fontWeight: 700,
    fontFamily: 'Inter, sans-serif',
    background: 'linear-gradient(90deg, #2C3E50, #FF6B9D, #FFA500, #6366F1, #16A085)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-center">Kvittr App Icon Generator</h1>
        <p className="text-center mb-8 text-gray-600">Screenshot each icon at exactly 1024x1024px</p>
        
        <div className="flex gap-8 justify-center flex-wrap">
          {/* Light Version */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">Light Version</h2>
            <div 
              style={{
                ...iconStyle,
                background: '#F5E6D3',
              }}
            >
              <span style={textStyle}>kvittr</span>
            </div>
          </div>

          {/* Dark Version */}
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">Dark Version</h2>
            <div 
              style={{
                ...iconStyle,
                background: '#1E293B',
              }}
            >
              <span style={textStyle}>kvittr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconGenerator;
