import LoginPage from "./LoginPage";
import DoctorForm from "./DoctorForm";
import { ProjectInfo } from "../../actions/api";
import * as Sentry from "@sentry/nextjs";

// Fetch static params for SSG (Static Site Generation)
export async function generateStaticParams() {
  try {
    console.log("Generating static paths for home page ...");
    const response = await fetch(
      `https://pixpro.app/api/projects/80223bb1e415d563d5ff065ce97871c7`,
      {
        method: "POST", // Changed from POST to GET
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-cache",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch static paths: ${response.statusText}`);
    }

    const pathnames = await response.json();
    return pathnames.map((path) => ({ pathname: path }));
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { pathname } = params;

  try {
    const projectInfo = await ProjectInfo(`${pathname}`);

    return {
      title: projectInfo?.name || "Default Title", 
      description: projectInfo?.seo_description || "Default description",
      openGraph: {
        title: projectInfo?.seo_title || "Default Title",
        description: projectInfo?.seo_description || "Default description",
        images: [projectInfo?.logo || "/default-image.jpg"],
      },
      twitter: {
        card: "summary_large_image",
        title: projectInfo?.seo_title || "Default Title",
        description: projectInfo?.seo_description || "Default description",
        image: projectInfo?.logo || "/default-image.jpg",
      },
    };
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    return {
      title: "Error",
      description: "Error loading the page",
      openGraph: {
        title: "Error",
        description: "Error loading the page",
        images: ["/error-image.jpg"],
      },
      twitter: {
        card: "summary_large_image",
        title: "Error",
        description: "Error loading the page",
        image: "/error-image.jpg",
      },
    };
  }
}

export default async function Home({ params }) {
  const { pathname } = params;

  try {
    const projectInfo = await ProjectInfo(`${pathname}`);

    if (
      projectInfo.features?.includes("default_employee") &&
      projectInfo.default_employee
    ) {
      return <DoctorForm projectInfo={projectInfo} id={pathname} />;
    } else {
      return <LoginPage projectInfo={projectInfo} id={pathname} />;
    }
  } catch (error) {
    Sentry.captureException(error);
    console.error(error);
    return <div>Error loading the page.</div>;
  }
}
