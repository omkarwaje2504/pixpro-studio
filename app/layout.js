import "./globals.css";


export const metadata = {
  title: "E-video platform",
  description: "Educate your patient with new E-video.",
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={` antialiased overflow-scroll bg-gray-50 dark:bg-gray-900 relative lg:w-2/5 mb-10 mx-auto `}
      >
        
        {children}
   
      </body>
    </html>
  );
}
