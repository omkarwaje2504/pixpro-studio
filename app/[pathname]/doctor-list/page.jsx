
import { ProjectInfo } from "../../../actions/api";
import DoctorList from "./DoctorList";
import * as Sentry from "@sentry/nextjs";

export async function generateStaticParams() {
  try {
    console.log("Generating static paths for doctor form ...");

    // Fetch list of projects to prebuild paths
    const response = await fetch(
      `https://pixpro.app/api/projects/80223bb1e415d563d5ff065ce97871c7`,
      {
        method: "POST",
        cache: "no-cache",
        body: undefined,
      }
    );
    let projects = await response.json();
    return projects.map((project) => ({
      pathname: project,
    }));
  } catch (error) {
    Sentry.captureException(error);
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
  try {
    return <DoctorList/>;
  } catch (error) {
    Sentry.captureException(error);
  }
}
