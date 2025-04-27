import { VideoRender, GetRenderStatus, contactSave } from "../../actions/api";
import { getItem, setItem } from "../../Utils/indexedDbHelper";
import * as Sentry from "@sentry/nextjs";

/**
 * Logs errors to Sentry with context
 * @param {Error} error - The error to log
 * @param {string} operation - The operation being performed
 * @param {object} additionalData - Any additional data to include
 */
function logToSentry(error, operation, additionalData = {}) {
  Sentry.withScope((scope) => {
    scope.setTags({
      component: "GenerateVideoHelper",
      operation,
    });

    scope.setExtras({
      ...additionalData,
    });

    Sentry.captureException(error);
  });

  // Also log to console
  console.error(`Error in ${operation}:`, error);
}

/**
 * Generates a video from template using the provided data
 * @param {string} employeeHash - Hash identifying the employee
 * @param {string} doctorHash - Hash identifying the doctor
 * @param {object} formData - Form data containing doctor details
 * @returns {Promise<{videoDownloadUrl: string, finalFormData: object}>}
 */
export async function generateTemplateVideo(
  employeeHash,
  doctorHash,
  formData
) {
  if (!formData) {
    const error = new Error("FormData is required to generate video");
    logToSentry(error, "generateTemplateVideo", { stage: "validation" });
    throw error;
  }

  try {
    // Add breadcrumb for operation start
    Sentry.addBreadcrumb({
      category: "video",
      message: "Starting video generation process",
      level: "info",
      data: {
        employeeHash,
        doctorHash: doctorHash.substring(0, 8) + "...", // Only log a portion for privacy
      },
    });

    // Get project info and extract domain/slug
    const projectInfo = await getItem("projectInfo");
    if (!projectInfo?.web_link) {
      const error = new Error("Project information is incomplete");
      logToSentry(error, "generateTemplateVideo", {
        stage: "getProjectInfo",
        projectInfoExists: !!projectInfo,
      });
      throw error;
    }

    const { subDomain, slug } = await extractDomainAndSlug(
      projectInfo.web_link
    );

    // Get video template ID
    if (!projectInfo.artworks || !projectInfo.artworks[0]?.name) {
      const error = new Error("Video template information is missing");
      logToSentry(error, "generateTemplateVideo", {
        stage: "getTemplateId",
        artworksExists: !!projectInfo.artworks,
        artworksLength: projectInfo.artworks?.length || 0,
      });
      throw error;
    }

    const videoId = projectInfo.artworks[0].name;

    // Prepare properties for video rendering
    const props = {
      ...formData.doctorDetails,
    };

    // Add breadcrumb for render initiation
    Sentry.addBreadcrumb({
      category: "video",
      message: "Initiating video render request",
      level: "info",
      data: {
        videoId,
        propsProvided: Object.keys(props).length > 0,
      },
    });

    // Initiate video rendering
    const renderResult = await VideoRender(videoId, props);

    if (!renderResult.success || !renderResult.data?.renderId) {
      const error = new Error(
        renderResult.message || "Failed to initiate video rendering"
      );
      logToSentry(error, "generateTemplateVideo", {
        stage: "videoRender",
        renderResult: JSON.stringify(renderResult).substring(0, 200),
      });
      throw error;
    }

    const renderKey = renderResult.data.renderId;

    // Add breadcrumb for polling
    Sentry.addBreadcrumb({
      category: "video",
      message: "Starting to poll for render completion",
      level: "info",
      data: {
        renderKey,
      },
    });

    // Poll for render completion
    return await pollRenderStatus(
      renderKey,
      formData,
      employeeHash,
      doctorHash,
      subDomain,
      slug
    );
  } catch (error) {
    // If the error wasn't already logged, log it here
    if (!error.logged) {
      logToSentry(error, "generateTemplateVideo", { stage: "unknown" });
      error.logged = true; // Mark as logged to prevent duplicate logging
    }
    throw new Error(`Video generation failed: ${error.message}`);
  }
}

/**
 * Polls the render status until completion or timeout
 * @param {string} renderKey - Render ID to check status
 * @param {object} formData - Original form data
 * @param {string} employeeHash - Employee identifier
 * @param {string} doctorHash - Doctor identifier
 * @param {string} subDomain - Company subdomain
 * @param {string} slug - Project slug
 * @returns {Promise<{videoDownloadUrl: string, finalFormData: object}>}
 */
async function pollRenderStatus(
  renderKey,
  formData,
  employeeHash,
  doctorHash,
  subDomain,
  slug
) {
  const MAX_ATTEMPTS = 20; // 5 minutes total (15s × 20)
  const POLL_INTERVAL = 15000; // 15 seconds

  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkStatus = async () => {
      try {
        // Add breadcrumb for each status check
        Sentry.addBreadcrumb({
          category: "video",
          message: `Checking render status (attempt ${
            attempts + 1
          }/${MAX_ATTEMPTS})`,
          level: "info",
          data: {
            renderKey,
            attempt: attempts + 1,
          },
        });

        const result = await GetRenderStatus(renderKey);

        // Check if rendering is complete
        if (result?.data?.status === "OK" && result.data?.url) {
          const videoDownloadUrl = result.data.url;

          // Add breadcrumb for successful render
          Sentry.addBreadcrumb({
            category: "video",
            message: "Video render completed successfully",
            level: "info",
            data: {
              attempts: attempts + 1,
              renderKey,
            },
          });

          // Update form data with video URL
          const finalFormData = {
            ...formData,
            avatarDetails: {
              videoDownloadUrl,
            },
            videoDownloadUrl,
          };

          try {
            // Save to storage
            await setItem("formData", finalFormData);

            // Save to API
            await contactSave(employeeHash, doctorHash, finalFormData);

            // Track video generation
            try {
              await fetch(
                `https://pixpro.app/api/company/${subDomain}/project/${slug}/video-generated/${doctorHash}`,
                { method: "POST" }
              );
            } catch (trackingError) {
              // Non-critical error, just log it
              logToSentry(trackingError, "pollRenderStatus.trackGeneration", {
                subDomain,
                slug,
                doctorHash: doctorHash.substring(0, 8) + "...",
              });
            }

            return resolve({ videoDownloadUrl, finalFormData });
          } catch (saveError) {
            logToSentry(saveError, "pollRenderStatus.saveData", {
              renderComplete: true,
              videoUrlReceived: !!videoDownloadUrl,
            });
            throw saveError;
          }
        }

        // Check if we've reached max attempts
        // Check if we've reached max attempts
        if (++attempts >= MAX_ATTEMPTS) {
          const timeoutError = new Error(
            `Video render timed out after ${MAX_ATTEMPTS} attempts`
          );
          logToSentry(timeoutError, "pollRenderStatus.timeout", {
            renderKey,
            maxAttemptsReached: true,
            totalTimeWaited: `${(MAX_ATTEMPTS * POLL_INTERVAL) / 1000} seconds`,
          });
          return reject(timeoutError);
        }


        setTimeout(checkStatus, POLL_INTERVAL);
      } catch (error) {
        logToSentry(error, "pollRenderStatus.checkStatus", {
          attempt: attempts,
          renderKey,
        });
        reject(error);
      }
    };

    // Start the polling process
    checkStatus();
  });
}

/**
 * Extracts subdomain and slug from a project web link
 * @param {string} webLink - The web link to parse
 * @returns {Promise<{subDomain: string, slug: string}>}
 */
export async function extractDomainAndSlug(webLink) {
  try {
    const url = new URL(webLink);
    const hostParts = url.hostname.split(".");

    // Extract subdomain from hostname
    const subDomain = hostParts.length > 2 ? hostParts[0] : "";

    // Extract slug from pathname
    const pathParts = url.pathname.split("/").filter(Boolean);
    const slug = pathParts.length > 0 ? pathParts[pathParts.length - 1] : "";

    if (!subDomain || !slug) {
      const error = new Error("Failed to extract domain or slug from web link");
      logToSentry(error, "extractDomainAndSlug", { webLink });
      throw error;
    }

    return { subDomain, slug };
  } catch (error) {
    logToSentry(error, "extractDomainAndSlug", { webLink });
    throw new Error(`Failed to parse web link: ${error.message}`);
  }
}
