# CafePay printer client

This desktop app opens the Persian CafePay staff app and connects it to installed printers.
Staff can select printers, print receipts, and import saved settings from the older desktop app.
It uses Electron 45, Electron Forge 8, and Node 22 or later.

## Local setup

First start [cafepal](https://github.com/cafepay-oss/cafepal) and [cafepay-admin](https://github.com/cafepay-oss/cafepay-admin).
The local Docker setup serves the staff app at `http://localhost:3001`.
Then run:

```sh
npm ci
CAFEPAY_ADMIN_URL=http://localhost:3001 npm start
```

In PowerShell, set the variable separately:

```powershell
$env:CAFEPAY_ADMIN_URL = "http://localhost:3001"
npm start
```

`CAFEPAY_ADMIN_URL` sets the staff app address when the desktop app starts.
Its default is `https://utils.cafepay.app`.
Local addresses can use HTTP; other addresses require HTTPS.
The app only opens pages with the configured protocol, host, and port.
It rejects URLs with embedded credentials.

## راهنمای کوتاه چاپگر

1. چاپگر را در سیستم‌عامل نصب کنید و چاپ آزمایشی سیستم‌عامل را انجام دهید.
2. برنامه رابط چاپگر را با نشانی مدیریت فروشگاه اجرا کنید.
3. وارد حساب کارکنان شوید و فروشگاه خود را انتخاب کنید.
4. در تنظیمات چاپگر مدیریت، چاپگر نصب‌شده را انتخاب کنید.
5. عرض کاغذ و کاربرد چاپگر را تنظیم کنید و چاپ آزمایشی بگیرید.
6. وضعیت صف چاپ را بررسی کنید؛ پذیرش کار توسط سیستم‌عامل، خروج کاغذ را تضمین نمی‌کند.

بستن پنجره، برنامه را در بخش اعلان سیستم نگه می‌دارد.
برای پایان کامل برنامه، گزینه «خروج» را از منوی آیکون برنامه انتخاب کنید.
گزینه «اجرای خودکار» شروع برنامه هنگام ورود به سیستم را کنترل می‌کند.
راهنمای فارسی مدیریت، تنظیمات فروشگاه و چاپگر را توضیح می‌دهد.

## Printing and saved settings

The web page uses a restricted interface for printer access.
It cannot use Node.js, Electron remote APIs, or read arbitrary local files.
Printing accepts installed printer names and HTML receipts up to 2 MiB.
Sample receipts support `6cm`, `7cm`, and `8cm` paper widths.
Print windows block JavaScript and external resources.
The application limits active print requests to five and uses a 30-second completion timeout.

The app reports completion after the operating system accepts the print job.
Physical paper delivery still depends on the printer.
The staff app manages the print queue and records accepted jobs.

The staff app imports supported settings from the older desktop app once.
It stores later settings in the browser storage of the desktop app.
A different protocol, host, or port uses separate browser storage.
This application does not expose the older HTTP printer service on port `38627`.

## Tests and packages

```sh
npm test
npm run package
```

The package command writes the application under `out/`.
Use `npm run make` to create the platform installer or archive configured in `forge.config.js`.
Create packages on a host with the tools for your target operating system.
The configuration includes Windows Squirrel, macOS ZIP, Debian, and RPM targets.

Tests use simulated Electron functions, printers, and operating system responses.
They check access limits, navigation, print results, failures, and automatic startup.
These tests do not confirm physical printing or installer behavior.

## Related repositories

- [cafepay-admin](https://github.com/cafepay-oss/cafepay-admin) provides the staff app, print queue, and Persian staff guide.
- [cafepal](https://github.com/cafepay-oss/cafepal) provides the backend, print jobs, and local Docker setup.
- [cafepay_waiter](https://github.com/cafepay-oss/cafepay_waiter) sends staff orders and kitchen print jobs through the backend.

## License

CafePay code uses the [MIT License](LICENSE).
