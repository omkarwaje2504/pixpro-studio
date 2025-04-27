"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getItem, removeItem, setItem } from "../../../Utils/indexedDbHelper";
import { CgPlayButtonO } from "react-icons/cg";
import {
  extractDomainAndSlug,
  generateTemplateVideo,
} from "../../Components/GenerateVideohelper";
import slugify from "slugify";
import { ImSpinner3 } from "react-icons/im";
import { downloadECard, NfcCard } from "./../../../services/PrepareEGreet";
import { contactSave } from "../../../actions/api";
import * as Sentry from "@sentry/nextjs";

const GENERATION_STATUSES = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

export default function GenerateVideo() {
  const [projectInfo, setProjectInfo] = useState(null);
  const [id, setId] = useState(null);
  const [formData, setFormData] = useState(null);
  const [employeeHash, setEmployeeHash] = useState(null);
  const [doctorHash, setDoctorHash] = useState("");
  const [progress, setProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState(
    GENERATION_STATUSES.IDLE
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();
  const generationInProgress = useRef(false);
  const progressInterval = useRef(null);

  const initializeData = useCallback(async () => {
    try {
      const storedEmployeeDetails = await getItem("employeeData");
      const storedFormData = await getItem("formData");
      const doctorDetails = await getItem("doctorHash");
      const projectData = await getItem("projectInfo");
      const storedId = await getItem("id");

      if (storedId) {
        setId(storedId);
      }

      if (projectData) {
        setProjectInfo(projectData);
      }

      if (storedFormData) {
        setFormData(storedFormData);
      }

      if (doctorDetails) {
        setDoctorHash(doctorDetails);
      }

      if (storedEmployeeDetails) {
        setEmployeeHash(storedEmployeeDetails.hash);
      } else {
        // Redirect if employee data is missing
        router.push(`/${storedId || ""}`);
      }
    } catch (error) {
      Sentry.captureException(error);
      setErrorMessage("Failed to load necessary data. Please try again.");
      setGenerationStatus(GENERATION_STATUSES.ERROR);
    }
  }, [router]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (generationStatus === GENERATION_STATUSES.LOADING) {
        event.preventDefault();
        event.returnValue =
          "Your video is still being generated. Are you sure you want to leave?";
        return event.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    initializeData();

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [initializeData]);


  useEffect(() => {
    const handlePopState = (event) => {
      if (generationStatus === GENERATION_STATUSES.LOADING) {
        const confirmation = confirm(
          "Your content is still being generated. Going back will lose progress. Do you want to go back?"
        );
        if (confirmation) {
          router.push(`/${id}/doctor-list`);
        } else {
          // Prevent navigation by pushing current state again
          window.history.pushState(null, "", window.location.href);
        }
      } else if (generationStatus !== GENERATION_STATUSES.SUCCESS) {
        const confirmation = confirm(
          "Going back will discard your data. Do you want to go back?"
        );
        if (confirmation) {
          router.push(`/${id}/doctor-list`);
        } else {
          window.history.pushState(null, "", window.location.href);
        }
      }
    };
  
    // Push a new history state to intercept back
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
  
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [generationStatus, id, router]);
  
  useEffect(() => {
    const checkVideoGeneration = localStorage.getItem("videoGeneration");
    if (
      checkVideoGeneration !== "true" &&
      formData &&
      !formData.videoDownloadUrl
    ) {
      startGeneration();
    } else if (formData && formData.videoDownloadUrl) {
      setGenerationStatus(GENERATION_STATUSES.SUCCESS);
    }
  }, [formData]);

  const startProgressIndicator = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    setProgress(10);

    progressInterval.current = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress < 90) {
          return prevProgress + 5;
        }
        return prevProgress;
      });
    }, 3000);
  };

  const stopProgressIndicator = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const startGeneration = async () => {
    if (generationInProgress.current) return;
  
    try {
      generationInProgress.current = true;
      setGenerationStatus(GENERATION_STATUSES.LOADING);
      setErrorMessage("");
      startProgressIndicator();

      const projectData = await getItem("projectInfo");
      const formInfo = await getItem("formData");
      const empData = await getItem("employeeData");
      const contactHash = await getItem("doctorHash");

      if (!projectData || !formInfo || !empData || !contactHash) {
        throw new Error("Missing required data for content generation");
      }

      if (projectData.texts.win_section_title === "E-Greeting") {
        if (projectInfo.texts.spin_prize_reject_button === "NFC") {
          const downloadUrl = await NfcCard(projectData, formInfo);

          const finalImageData = {
            ...formInfo,
            videoDownloadUrl: downloadUrl,
          };
  
          await contactSave(empData.hash, contactHash, finalImageData);
          setFormData(finalImageData);
          await setItem("formData", finalImageData);
          setProgress(100);
          setGenerationStatus(GENERATION_STATUSES.SUCCESS);
          localStorage.setItem("videoGeneration", "true");

        } else {
          const downloadUrl = await downloadECard(projectData, formInfo);

          const finalImageData = {
            ...formInfo,
            videoDownloadUrl: downloadUrl,
          };
  
          await contactSave(empData.hash, contactHash, finalImageData);
          setFormData(finalImageData);
          await setItem("formData", finalImageData);
          setProgress(100);
          setGenerationStatus(GENERATION_STATUSES.SUCCESS);
          localStorage.setItem("videoGeneration", "true");

        }

        
        
      } else {
        const { finalFormData } = await generateTemplateVideo(
          empData.hash,
          contactHash,
          formInfo
        );

        if (finalFormData && finalFormData.videoDownloadUrl) {
          setFormData(finalFormData);
          setProgress(100);
          setGenerationStatus(GENERATION_STATUSES.SUCCESS);
          localStorage.setItem("videoGeneration", "true");
        } else {
          throw new Error(
            "Video generation completed, but no download URL was received"
          );
        }
      }
    } catch (error) {
      Sentry.captureException(error);
      setErrorMessage(
        error.message ||
          "There was a problem generating your content. Please try again."
      );
      generationInProgress.current = false;
      setGenerationStatus(GENERATION_STATUSES.ERROR);
    } finally {
      generationInProgress.current = false;
      stopProgressIndicator();
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();

    let response;
    let projectType;
    let fileExtension;

    if (!formData?.videoDownloadUrl) {
      setErrorMessage("No content available to download");
      return;
    }

    if (
      projectInfo?.texts?.win_section_title === "E-Greeting" &&
      !projectInfo?.features?.includes("pdf_ecard")
    ) {
      projectType = "E-Greeting";
      fileExtension = "jpg";
    } else if (isNFC()) {
      projectType = "NFC";
      fileExtension = "jpg";
    } else if (projectInfo?.features?.includes("pdf_ecard")) {
      projectType = "PDF";
      fileExtension = "pdf";
    } else {
      projectType = "Video";
      fileExtension = "mp4";
    }

    let fileName = `${slugify(formData?.doctorDetails?.name || "download", {
      replacement: "",
      remove: /[*+~.()'"!:@]/g,
      lower: false,
    })}.${fileExtension}`;

    try {
      setIsDownloading(true);

      response = await fetch(formData.videoDownloadUrl, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`
        );
      }

      // Download the file
      const contentBlob = await response.blob();
      const FileSaver = (await import("file-saverjs")).default;
      FileSaver(contentBlob, fileName);

      // Track download analytics
      if (projectInfo?.web_link) {
        const { subDomain, slug } = await extractDomainAndSlug(
          projectInfo.web_link
        );

        await fetch(
          `https://pixpro.app/api/company/${subDomain}/project/${slug}/download/${doctorHash}`,
          { method: "GET" }
        );
      }

      await removeItem("doctorHash");
      await removeItem("formData");
      await removeItem("prevData");
      localStorage.removeItem("videoGeneration");

      setTimeout(() => {
        if (projectInfo?.features?.includes("default_employee")) {
          setIsDownloading(false);
          router.push(`/${id}`);
        } else {
          setIsDownloading(false);
          router.push(`/${id}/doctor-list`);
        }
      }, 1000);
    } catch (error) {
      Sentry.captureException(error);
      setErrorMessage("Failed to download. Please try again.");
      setIsDownloading(false);
    }
  };

  const renderContent = () => {
    if (!formData) return null;

    if (projectInfo?.texts?.win_section_title === "E-Greeting") {
      return (
        <div className="w-full flex flex-col items-center overflow-hidden">
          <div className="w-3/4 max-h-[33rem]">
            {formData.videoDownloadUrl ? (
              projectInfo.features.includes("pdf_ecard") ? (
                <iframe
                  src={`${formData.videoDownloadUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-[24rem] rounded-xl shadow-lg scroll-hide"
                  type="application/pdf"
                />
              ) : (
                <img
                  src={formData.videoDownloadUrl}
                  alt="E-Greeting"
                  className="w-full rounded-xl shadow-lg"
                />
              )
            ) : (
              <div className="flex justify-center items-center h-64">
                <ImSpinner3 className="animate-spin text-4xl w-10 h-10 dark:fill-white" />
              </div>
            )}
          </div>
        </div>
      );
    } else {
      return (
        <div className="px-4 py-1 bg-white dark:bg-gray-800 shadow-lg rounded-3xl sm:p-10 h-full w-full">
          <div className="max-w-md mx-auto">
            <div className="flex flex-col justify-center items-center">
              {formData.videoDownloadUrl ? (
                <div className="w-full max-w-2xl my-1 rounded-xl overflow-hidden max-h-full">
                  <video
                    src={formData.videoDownloadUrl}
                    autoPlay
                    loop
                    controls
                    controlsList="nodownload"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
              ) : (
                <div className="py-3 w-full flex flex-col items-center">
                  <CgPlayButtonO className="w-28 h-28 mb-6 animate-pulse fill-gray-500 dark:fill-sky-300" />
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden border border-gray-500 relative">
                    <div
                      className="bg-gradient-to-tr from-purple-500 px-1 text-center to-indigo-500 text-xs text-white font-medium h-full absolute top-0 left-0 transition-all ease-in-out duration-500"
                      style={{ width: `${progress}%` }}
                    >
                      {progress > 0 ? `${progress}%` : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  };

  const renderStatusMessage = () => {
    if (generationStatus === GENERATION_STATUSES.LOADING) {
      return (
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mt-2">
          Please wait while your{" "}
          { isNFC() ? "NFC preview" :projectInfo?.texts?.win_section_title === "E-Greeting"
            ? projectInfo.features.includes("pdf_ecard")
              ? "PDF"
              : "greeting"
            : "video"}{" "}
          is being generated. This may take a minute.
        </p>
      );
    }

    if (generationStatus === GENERATION_STATUSES.ERROR) {
      return (
        <p className="text-center text-sm text-red-500 mt-2">{errorMessage}</p>
      );
    }

    if (
      generationStatus === GENERATION_STATUSES.SUCCESS &&
      formData?.videoDownloadUrl
    ) {
      return (
        <p className="text-center text-sm text-green-500 mt-2">
          Your{" "}
          {isNFC()? "NFC preview":projectInfo?.texts?.win_section_title === "E-Greeting"
            ? projectInfo.features.includes("pdf_ecard")
              ? "PDF"
              : "greeting"
            : "video"}{" "}
          has been generated successfully! You can download it now.
        </p>
      );
    }

    return null;
  };

  const isNFC = () => {
    return projectInfo?.texts?.spin_prize_reject_button === "NFC";
  };

  const renderActionButtons = () => {
    if (generationStatus === GENERATION_STATUSES.ERROR) {
      return (
        <button
          className="font-semibold text-white text-xl px-4 py-2 border-4 border-white rounded-full drop-shadow-lg bg-gradient-to-b from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 transition-colors disabled:opacity-50"
          onClick={() => {
            ``;
            startGeneration();
          }}
          disabled={generationInProgress.current}
        >
          {generationInProgress.current ? (
            <div className="flex gap-1 items-center">
              <ImSpinner3 className="animate-spin w-5 h-5" />
              <span>Retrying...</span>
            </div>
          ) : (
            "Try Again"
          )}
        </button>
      );
    } else if (
      generationStatus === GENERATION_STATUSES.SUCCESS &&
      formData?.videoDownloadUrl
    ) {
      return (
        <button
          onClick={(e) => {
            if (isNFC()) {
              router.push(`/${id}/doctor-list`);
            } else {
              handleDownload(e);
            }
          }}
          disabled={!isNFC() && isDownloading}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 font-semibold text-white text-xl border-4 border-white rounded-full drop-shadow-lg transition-colors disabled:opacity-50"
        >
          {isNFC() ? (
            "Go Back"
          ) : isDownloading ? (
            <div className="py-1 px-4 flex items-center justify-center gap-1">
              <ImSpinner3 className="animate-spin w-5 h-5" />
              <span>Downloading...</span>
            </div>
          ) : (
            `Download ${
              projectInfo.features.includes("pdf_ecard")
                ? "PDF"
                : projectInfo?.texts?.win_section_title === "E-Greeting"
                ? "E-Greeting"
                : "Video"
            }`
          )}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="h-[100dvh] relative">
      <div className="py-4 flex flex-col sm:py-12 z-20 px-2 relative overflow-hidden items-center overflow-y-auto mt-20">
        {renderContent()}

        <div className="mx-auto mt-4 flex flex-col items-center">
          {renderStatusMessage()}

          <div className="mt-4">{renderActionButtons()}</div>
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 dark:text-gray-100 mt-20 text-center">
          <p>Powered by</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
            PixPro.app
          </p>
        </div>
      </div>
    </div>
  );
}
