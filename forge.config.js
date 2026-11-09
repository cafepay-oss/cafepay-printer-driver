const config = {
  "packagerConfig": {},
  "makers": [
    {
      "name": "@electron-forge/maker-squirrel",
      "config": {
        "name": "cafepay_printer_utils",
        "setupIcon": "cafepay-logo.ico"
      }
    },
    {
      "name": "@electron-forge/maker-zip",
      "platforms": [
        "darwin"
      ]
    },
    {
      "name": "@electron-forge/maker-deb",
      "config": {}
    },
    {
      "name": "@electron-forge/maker-rpm",
      "config": {}
    }
  ]
};
if (process.platform === "win32") config.packagerConfig.icon = "cafepay-logo.ico";
module.exports = config;
