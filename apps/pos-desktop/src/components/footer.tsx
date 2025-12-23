const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-b absolute bottom-0 inset-x-0 h-8 flex items-center justify-center bg-sidebar">
      <span className="text-text text-xs">
        Powered by Cedar Core. &copy; {currentYear} All rights reserved.
      </span>
    </footer>
  );
};
export default Footer;
