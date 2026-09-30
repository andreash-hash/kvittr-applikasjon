// Web e2e stub only (E2E_WEB=1): read a blob:/data: URI as base64 (native file IO is NOT exercised).
module.exports = {
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  readAsStringAsync: async (uri) => {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1]);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  },
};
