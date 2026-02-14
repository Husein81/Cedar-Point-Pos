const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-b h-8 flex items-center justify-center bg-background fixed bottom-0 w-full">
      <span className="text-text text-xs">
        Powered by Cedar Core. &copy; {currentYear} All rights reserved.
      </span>
    </footer>
  );
};
export default Footer;
