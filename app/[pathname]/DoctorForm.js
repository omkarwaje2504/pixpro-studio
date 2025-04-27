"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { contactSave, FetchDoctorDetails } from "../../actions/api";
import UploadFile from "../../services/uploadFile";
import { ImSpinner3 } from "react-icons/im";
import { MdOutlineFileUpload } from "react-icons/md";
import { setItem, getItem, removeItem } from "../../Utils/indexedDbHelper";
import { IoMdArrowBack } from "react-icons/io";
import { BiRotateRight, BiRotateLeft } from "react-icons/bi";
import { AiOutlineZoomIn, AiOutlineZoomOut } from "react-icons/ai";
import Image from "next/image";
import * as Sentry from "@sentry/nextjs";

export default function DoctorForm({ projectInfo, id }) {
  const [formData, setFormData] = useState(null);
  //---------backend data states---------
  const [employeeHash, setEmployeeHash] = useState(null);
  const [fieldData, setFieldData] = useState(null);
  const [contactList, setContactList] = useState(null);
  const [checkContact, setCheckContact] = useState(false);
  const [isDataChecked, setIsDataChecked] = useState(false);
  const [isContactNew, setIsContactNew] = useState(true);
  const [currentStep, setCurrentStep] = useState(0); // Step tracker
  const [submissionStatus, setSubmissionStatus] = useState(false); // Step tracker
  const [errorMessage, setErrorMessage] = useState(""); // Step tracker
  const [projectData, setProjectInfo] = useState(null);
  const [showFinalPreview, setShowFinalPreview] = useState(false);
  const containerRef = useRef(null);
  //-------------cropper image ---------------------
  const router = useRouter();
  const steps = [
    { id: 1, name: "Doctor Information" },
    { id: 2, name: "Doctor Photo" },
    { id: 4, name: "Review" },
  ];
  const Initializer = useCallback(async () => {
    const oldId = await getItem("id");
    setProjectInfo(projectInfo);
    localStorage.removeItem("videoGeneration");
    if (oldId && id !== oldId) {
      await removeItem("id");
      await removeItem("employeeData");
      await removeItem("formData");
      await removeItem("projectInfo");
    }
    await setItem("id", id);
    if (
      projectInfo &&
      projectInfo.features &&
      projectInfo.features.length > 0 &&
      projectInfo.features?.includes("default_employee")
    ) {
      await removeItem("formData");
    }
    await removeItem("doctorHash");
    const storedFormData = await getItem("formData");
    const storedContactList = await getItem("contactList");
    const storedEmployeeData = await getItem("employeeData");

    if (projectInfo) {
      if (storedEmployeeData) {
        setEmployeeHash(storedEmployeeData.hash);
      } else {
        await setItem("employeeData", {
          hash: projectInfo?.default_employee?.employee_hash,
        });
        setEmployeeHash(projectInfo?.default_employee?.employee_hash);
      }

      if (!projectInfo?.features?.includes("ghibili_effect")) {
        setFieldData(projectInfo.fields);
      }
    }
    if (storedFormData) {
      setFormData(storedFormData);
    }
    if (storedContactList) {
      setContactList(storedContactList);
    }
  }, [id, projectInfo]);

  useEffect(() => {
    Initializer();
  }, [Initializer]);

  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
  }, [currentStep]);

  useEffect(() => {
    if (projectData) {
      setItem("projectInfo", projectData);
    }
  }, [projectData]);
  useEffect(() => {
    if (formData) {
      setItem("formData", formData);
    }
  }, [formData]);

  // --------------- next & previous button --------------------------------
  const handleNext = () => {
   
    if (currentStep < steps.length - 1) {
      setCurrentStep((prevStep) => prevStep + 1);
    }
  };
  const handlePrevious = () => {
   

    if (currentStep > 0) {
      setCurrentStep((prevStep) => prevStep - 1);
    }
  };

  const formHandle = (e) => {
    e.preventDefault();
    if (e.target.name === "contact_no") {
      if (!/^\d{0,10}$/.test(e.target.value)) {
        return;
      }
      if (
        projectInfo &&
        projectInfo.features &&
        projectInfo.features.length > 0 &&
        !projectInfo.features?.includes("default_employee")
      ) {
        contactList.map((contact) => {
          if (contact.mobile === e.target.value) {
            setCheckContact(contact);
          }
        });
      }
    }
    setFormData((prevData) => ({
      ...prevData,
      doctorDetails: {
        ...prevData?.doctorDetails,
        [e.target.name]: e.target.value,
      },
    }));
  };

  const handleContactCheck = async (check) => {
    if (check === "fetch") {
      const fetchDoctor = await FetchDoctorDetails(
        employeeHash,
        checkContact.hash
      );
      const data = {
        doctorDetails: {
          name: fetchDoctor.data.contact.name,
          contact_no: fetchDoctor.data.contact.mobile,
        },
      };
      setFormData(data);
      setItem("prevData", data);

      setCheckContact(false);
      setIsContactNew(false);
    } else {
      setIsContactNew(true);
      setCheckContact(false);
    }
  };

  const isTimesofyou = () => {
    return projectInfo?.texts?.ai_script === "timesofyou";
  };

  const handleSubmit = async () => {
    setSubmissionStatus(true);
    try {
      if (!formData || !isDataChecked) {
        setErrorMessage("check the checkbox is clicked");
        setTimeout(() => {
          setErrorMessage("");
        }, 3000);
        setSubmissionStatus(false);
        return;
      }

      if (projectInfo?.features?.includes("ghibili_effect")) {
        setShowFinalPreview(true);
        setSubmissionStatus(false);
        return;
      } else {
        const { name, contact_no, photo } = formData.doctorDetails;

        if (!name || !photo) {
          setErrorMessage("Please fill all the form fields");
          setTimeout(() => {
            setErrorMessage("");
          }, 3000);

          setSubmissionStatus(false);
          return;
        }

        const doctorHash = isContactNew ? await getItem("doctorHash") : null;
        const saveResult = await contactSave(
          employeeHash,
          doctorHash,
          formData
        );
        const updatedData = {
          ...formData,
          doctorDetails: {
            ...formData.doctorDetails,
            name: saveResult.data.contact.name,
          },
        };
        await setItem("formData", updatedData);
        setSubmissionStatus(false);

        if (saveResult.success) {

          // Handle Photo Frame product type
          if (projectInfo && projectInfo.product_name === "Photo Frame") {
            localStorage.removeItem("formData");
            setItem("doctorHash", saveResult.data.contact.hash);
            router.push(`/${id}/doctor-list`);
            router.refresh();
          }
          // Handle E-Greeting product type
          else if (projectInfo && projectInfo.product_name === "E-Greeting") {
            setItem("doctorHash", saveResult.data.contact.hash);
            router.push(`/${id}/generate-video`);
          }
          else if(isTimesofyou()){
            localStorage.removeItem("formData");
            setItem("doctorHash", saveResult.data.contact.hash);
            router.push(`/${id}/doctor-list`);
            router.refresh();
          }
          // Handle projects with default_employee feature
          else if (
            projectInfo &&
            projectInfo.features &&
            projectInfo.features.length > 0 &&
            projectInfo?.features?.includes("default_employee") &&
            !projectInfo.artworks
          ) {
            localStorage.removeItem("formData");
            router.refresh();
          }
          // Default case for other project types
          else {
            setItem("doctorHash", saveResult.data.contact.hash);
            router.push(`/${id}/generate-video`);
          }
        } else if (!saveResult.success && saveResult.message) {
          throw new Error(saveResult.message);
        }

        setSubmissionStatus(false);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("An error occur while saving. Please refresh and try again");
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      setSubmissionStatus(false);
      alert("An error occurred. Please try again.", JSON.stringify(error));
      Sentry.captureException(error);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmissionStatus(true);
    try {
      if (!formData.doctorDetails.photo) {
        throw new Error("Photo is missing. Please upload a photo.");
      }

      const doctorHash = isContactNew ? await getItem("doctorHash") : null;

      // Create a copy of the formData to ensure we're sending the complete data
      const dataToSubmit = {
        ...formData,
        doctorDetails: {
          ...formData.doctorDetails,
          // Ensure photo is explicitly included
          photo: formData.doctorDetails.photo,
        },
      };

      const saveResult = await contactSave(
        employeeHash,
        doctorHash,
        dataToSubmit
      );
      const updatedData = {
        ...dataToSubmit,
        doctorDetails: {
          ...dataToSubmit.doctorDetails,
          name: saveResult.data.contact.name,
        },
      };
      await setItem("formData", updatedData);
      setSubmissionStatus(false);

      if (saveResult.success) {
        // Handle Photo Frame product type
        if (projectInfo && projectInfo.product_name === "Photo Frame") {
          localStorage.removeItem("formData");
          setItem("doctorHash", saveResult.data.contact.hash);
          router.push(`/${id}/doctor-list`);
          router.refresh();
        }
        // Handle E-Greeting product type
        else if (projectInfo && projectInfo.product_name === "E-Greeting") {
          setItem("doctorHash", saveResult.data.contact.hash);
          router.push(`/${id}/generate-video`);
        }
        // Handle projects with default_employee feature
        else if (
          projectInfo &&
          projectInfo.features &&
          projectInfo.features?.length > 0 &&
          projectInfo.features?.includes("default_employee") &&
          !projectInfo.artworks
        ) {
          localStorage.removeItem("formData");
          router.refresh();
        }
        // Default case for other project types
        else {
          setItem("doctorHash", saveResult.data.contact.hash);
          router.push(`/${id}/generate-video`);
        }
      } else if (!saveResult.success && saveResult.message) {
        throw new Error(saveResult.message);
      }

      setSubmissionStatus(false);
    } catch (error) {
      console.error("Submission error:", error);
      setErrorMessage(error.message);
      setTimeout(() => {
        setErrorMessage("");
      }, 3000);
      setSubmissionStatus(false);
      alert(
        "An error occurred during submission. Please try again. " +
          error.message
      );
      Sentry.captureException(error);
    }
  };

  return (
    <div
      className="h-[100dvh] relative overflow-y-scroll pb-4 w-full scroll-hide"
      ref={containerRef}
    >
      {projectInfo &&
        projectInfo.features &&
        projectInfo.features.length > 0 &&
        !projectInfo?.features?.includes("default_employee") && (
          <div className="w-full py-3 flex border-b items-center px-4 border-gray-400 dark:border-gray-600 bg-white bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-70">
            {currentStep == 0 && (
              <IoMdArrowBack
                className="w-9 h-9 fill-black dark:fill-white cursor-pointer bg-white p-1 rounded-full"
                onClick={() => {
                  const confirmNavigation = window.confirm(
                    "If you go back, the data you entered will be lost. Do you want to continue?"
                  );
                  if (confirmNavigation) {
                    router.push(`/${id}/doctor-list`);
                  }
                }}
              />
            )}
          </div>
        )}

      {projectInfo?.top_banner && currentStep == 0 && (
        <div className="flex items-center justify-center w-full max-w-xl mx-auto overflow-hidden">
          <Image
            src={projectInfo?.top_banner}
            width={0}
            height={0}
            alt={projectInfo?.name}
            sizes="100vw"
            className="w-full"
          />
        </div>
      )}
      {/* --------------------Header Section----------------- */}

      <div className=" flex flex-col z-20 px-2 relative overflow-hidden items-center overflow-y-scroll scroll-hide">
        {/* ---------------------Contact Check----------------- */}
        {checkContact && (
          <div className="fixed top-0 z-50 left-0 bg-gray-700 bg-opacity-30 w-full h-screen px-4 flex items-center justify-center">
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: 0.3 },
              }}
              className="bg-white dark:bg-gray-700 border-4 border-blue-400 rounded-xl shadow-md shadow-indigo-400 p-6"
            >
              <p className="text-2xl font-medium dark:text-gray-100">
                Doctor already exists with this number
              </p>
              <p className="text-lg leading-6 mt-3 text-gray-600 dark:text-gray-300">
                Want to create a new doctor or want to fetch the existing
                doctor?
              </p>
              <div className="flex flex-col w-full mt-8 gap-3">
                <button
                  onClick={() => handleContactCheck("fetch")}
                  className="text-xl font-medium text-white shadow-md  drop-shadow-lg w-full border-2 border-white rounded-xl py-3 px-4 bg-gradient-to-tr from-blue-500 to-sky-400 "
                >
                  Fetch Existing
                </button>
                <button
                  onClick={() => handleContactCheck("create")}
                  className="text-xl font-medium text-white shadow-md drop-shadow-lg w-full border-2 border-white rounded-xl py-3 px-4 bg-gradient-to-tr from-purple-600 to-indigo-500 "
                >
                  Create New
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ---------------------------------cropper image-------------------------------- */}
        {/* Form Container */}
        <div
          className="flex transition-all ease-in-out duration-1000"
          style={{
            transform: `translateX(-${currentStep * 100}%)`, // Slide effect
            width: `${steps.length * 100}%`, // Ensures all steps fit horizontally
          }}
        >
          {/* Step 2: Personal Information */}
          <div className="min-w-full scroll-smooth overflow-y-scroll flex flex-col items-center mt-4">
            <InputField
              formHandle={formHandle}
              id={"name"}
              label={
                projectInfo?.id === "owq3p38v"
                  ? "Full Name"
                  : projectInfo?.texts?.contact_name_label ||
                    "Enter Doctor Name"
              }
              placeholder={
                projectInfo?.id === "owq3p38v"
                  ? "Akash Sakpal"
                  : projectInfo?.texts?.contact_name_placeholder ||
                    "Enter Doctor Name"
              }
              type={"text"}
              required={true}
              value={formData?.doctorDetails?.name}
            />
            {projectInfo &&
              projectInfo.features &&
              projectInfo.features.length >= 0 &&
              !projectInfo?.features?.includes("contact_disable_mobile") && (
                <InputField
                  formHandle={formHandle}
                  id={"contact_no"}
                  label={
                    projectInfo?.id === "owq3p38v"
                      ? "Mobile No."
                      : projectInfo?.texts?.contact_mobile_label ||
                        "Enter Doctor Contact Number"
                  }
                  placeholder={
                    projectInfo?.id === "owq3p38v"
                      ? "Eg: +91 1234567890"
                      : projectInfo?.texts?.contact_mobile_placeholder ||
                        "Enter Doctor Mobile Number..."
                  }
                  type={"number"}
                  required={true}
                  value={formData?.doctorDetails?.contact_no}
                />
              )}
            {/* Dynamic Fields valid for text,email, number, dropdown, radio, checkbox*/}
            {!projectInfo?.features?.includes("ghibili_effect") &&
              fieldData &&
              Object.values(fieldData).map((field, index) => (
                <DynamicInputComponent
                  field={field}
                  key={index}
                  formData={formData}
                  formHandle={formHandle}
                />
              ))}
            <NavigationButton
              projectInfo={projectInfo}
              formData={formData}
              handleNext={handleNext}
              handlePrevious={handlePrevious}
              currentStep={currentStep}
              steps={steps}
            />
          </div>

          {/* Step 1: Photo Upload*/}
          <div className="min-w-full flex flex-col items-center rounded-lg">
            <PhotoUpload
              formData={formData}
              setFormData={setFormData}
              projectInfo={projectInfo}
            />
            <NavigationButton
              formData={formData}
              handleNext={handleNext}
              handlePrevious={handlePrevious}
              currentStep={currentStep}
              steps={steps}
            />
          </div>

          <div className="min-w-full flex flex-col items-center mt-3">
            <div className="flex flex-col items-center">
              {formData && formData.doctorDetails?.photo && (
                <div className="text-sm font-medium text-gray-800 flex gap-2 mt-2">
                  <div className="w-40 max-h-48 rounded-xl  overflow-hidden justify-center flex">
                    <Image
                      src={formData.doctorDetails?.photo}
                      alt="doctor-image"
                      className="w-auto h-full border-2 border-indigo-500 dark:border-white rounded-xl overflow-hidden"
                      width={0}
                      height={0}
                      sizes="100vw"
                    />
                  </div>
                </div>
              )}
              {formData && formData.doctorDetails?.name && (
                <p className="text-2xl mt-2 font-medium text-gray-800 dark:text-white">
                  {formData.doctorDetails?.name}
                </p>
              )}
              {formData && formData.doctorDetails?.speciality && (
                <p className="text-xl text-gray-800 dark:text-white">
                  {formData.doctorDetails?.speciality}
                </p>
              )}

              {formData && formData.doctorDetails?.contact_no && (
                <div className="text-sm font-medium text-gray-800 dark:text-gray-100 flex gap-1 items-center">
                  {formData.doctorDetails?.contact_no}
                </div>
              )}
              <div className="w-full mx-auto">
                <table className="w-full mt-4">
                  <tbody>
                    {formData &&
                      formData.doctorDetails &&
                      Object.keys(formData.doctorDetails).map((data, index) => {
                        if (
                          data === "photo" ||
                          data === "image" ||
                          data === "voice" ||
                          data === "name" ||
                          data === "contact_no"
                        ) {
                          return;
                        }
                        return (
                          <tr key={index}>
                            <th className="border dark:border-gray-300 border-gray-700 px-4 dark:text-white py-1 text-left capitalize">
                              {data}
                            </th>
                            <th className="border dark:border-gray-300 border-gray-700 px-4 dark:text-white py-1 font-normal text-left max-w-52">
                              {formData.doctorDetails?.[data]}
                            </th>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 flex gap-1 text-xs text-gray-700 dark:text-white font-medium">
              <input
                type="checkbox"
                name="isCheck"
                id="isCheck"
                onChange={() => setIsDataChecked(!isDataChecked)}
              />
              <label htmlFor="isCheck">
                Once data is submitted, it can&apos;t be changed
              </label>
            </div>

            {/* Navigation Buttons */}

            {errorMessage && (
              <p className="text-red-500 py-2 text-sm">{errorMessage}</p>
            )}
            <NavigationButton
              handleNext={handleNext}
              handlePrevious={handlePrevious}
              currentStep={currentStep}
              steps={steps}
              submission={true}
              handleSubmit={handleSubmit}
              isDataChecked={isDataChecked}
              submissionStatus={submissionStatus}
            />
          </div>
        </div>
      </div>
      {showFinalPreview && (
        <FinalPreviewModal
          formData={formData}
          onClose={() => setShowFinalPreview(false)}
          onSubmit={handleFinalSubmit}
          submissionStatus={submissionStatus}
        />
      )}
    </div>
  );
}

function FinalPreviewModal({ formData, onClose, onSubmit, submissionStatus }) {
  const frameStyles = {
    borderWidth: "15px",
    borderStyle: "solid",
    borderColor: "#000000", // Solid black border
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
    padding: "10px",
    backgroundColor: "transparent", // Removed white background
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-4 dark:text-white">
          Final Preview
        </h2>

        <div className="flex flex-col items-center">
          {/* Framed Image */}
          <div style={frameStyles} className="rounded-md mb-4">
            <Image
              src={formData.doctorDetails?.photo}
              alt={`${formData.doctorDetails?.name} photo`}
              width={300}
              height={300}
              className="object-cover"
              style={{
                objectFit: "cover",
                width: "100%",
                height: "auto",
                maxHeight: "300px",
              }}
            />
          </div>

          <div className="text-center mb-6">
            <h3 className="text-xl font-bold mb-1 dark:text-white">
              {formData.doctorDetails?.name}
            </h3>
            {formData.doctorDetails?.speciality && (
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-1">
                {formData.doctorDetails?.speciality}
              </p>
            )}
            {formData.doctorDetails?.contact_no && (
              <p className="text-md text-gray-600 dark:text-gray-400">
                {formData.doctorDetails?.contact_no}
              </p>
            )}
          </div>

          <div className="flex justify-center gap-4 w-full">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg w-1/2"
            >
              Edit
            </button>
            <button
              onClick={onSubmit}
              disabled={submissionStatus}
              className="px-4 py-2 bg-green-600 text-white rounded-lg w-1/2 flex items-center justify-center"
            >
              {submissionStatus ? (
                <ImSpinner3 className="animate-spin h-5 w-5" />
              ) : (
                "Confirm & Submit"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavigationButton({
  projectInfo,
  formData,
  handlePrevious,
  handleNext,
  currentStep,
  steps,
  submission,
  handleSubmit,
  isDataChecked,
  submissionStatus,
}) {
  const isNextButtonDisabled = () => {
    if (currentStep === steps.length - 1) return true;

    if (currentStep === 0) {
      const hasName = Boolean(formData?.doctorDetails?.name);

      const hasMobile = Boolean(
        projectInfo?.product_name === "Photo Frame" &&
          formData?.doctorDetails?.contact_no
      );

      let hasRequiredSpeciality = true;

      if (
        projectInfo?.fields?.speciality &&
        projectInfo.fields.speciality.validations?.required === true
      ) {
        hasRequiredSpeciality = Boolean(formData?.doctorDetails?.speciality);
      }
      if (projectInfo?.product_name === "Photo Frame") {
        return !(hasName && hasMobile && hasRequiredSpeciality);
      }
      return !hasName;
    }

    if (currentStep === 1) {
      return !formData?.doctorDetails?.photo;
    }

    return false;
  };

  return (
    <div className="mt-10 flex justify-between w-80 gap-2">
      <button
        onClick={handlePrevious}
        disabled={currentStep === 0}
        className={`px-5 py-3 rounded-lg text-xl transition-opacity duration-300 delay-100 w-fit ${
          currentStep === 0 ? "hidden" : "bg-gray-200"
        }`}
      >
        <IoMdArrowBack className="w-8 h-8 fill-black cursor-pointer" />
      </button>
      {!submission && (
        <button
          onClick={handleNext}
          disabled={isNextButtonDisabled()}
          className={`px-5 py-3 rounded-lg text-xl w-full  ${
            currentStep === steps.length - 1 || isNextButtonDisabled()
              ? "bg-gray-300 text-gray-500"
              : "bg-gradient-to-b from-sky-300 to-sky-500 text-white"
          }`}
        >
          Next
        </button>
      )}
      {submission && (
        <button
          onClick={handleSubmit}
          disabled={isDataChecked ? false : true}
          className={`px-5 py-3 rounded-lg text-2xl w-full ${
            !isDataChecked
              ? "bg-gray-300 text-gray-500"
              : "bg-sky-500 text-white"
          }`}
        >
          {submissionStatus ? (
            <div className="px-6 flex gap-2 items-center">
              {"Submitting"}
              <ImSpinner3 className="animate-spin w-4 h-4" />{" "}
            </div>
          ) : (
            <>Submit</>
          )}
        </button>
      )}
    </div>
  );
}
function DynamicInputComponent({ field, formHandle, formData }) {
  const renderInputField = () => {
    // Check if field is required correctly using validations (not validation)
    const isRequired = field?.validations?.required || false;

    switch (field?.type) {
      case "text":
      case "email":
      case "number":
        return (
          <InputField
            formHandle={formHandle}
            id={field?.name}
            label={field?.label}
            placeholder={field?.placeholder || "Enter here..."}
            type={field?.type}
            required={isRequired}
            value={formData?.doctorDetails?.[field?.name]}
          />
        );

      case "dropdown":
        return (
          <select
            className="mt-2 bg-zinc-50 dark:bg-gray-600 text-zinc-600 dark:text-gray-100 text-lg w-full ring-1 ring-zinc-400 focus:ring-2 focus:ring-indigo-400 outline-none duration-300 rounded-xl pl-6 py-3 shadow-md focus:shadow-md focus:shadow-indigo-400"
            id={field?.name}
            name={field?.name}
            required={isRequired}
            onChange={(e) => formHandle(e)}
            value={formData?.doctorDetails?.[field?.name] || ""}
          >
            <option value="" disabled>
              {field?.placeholder || "Select an option..."}
            </option>
            {field?.options?.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="mt-2">
            {field?.options?.map((option, idx) => (
              <label
                key={idx}
                className="inline-flex items-center mr-4 text-gray-600 dark:text-gray-100 text-lg"
              >
                <input
                  type="radio"
                  name={field?.name}
                  value={option}
                  checked={formData?.doctorDetails?.[field?.name] === option}
                  onChange={(e) => formHandle(e)}
                  className="form-radio text-indigo-600 "
                  required={isRequired}
                />
                <span className="ml-2 text-zinc-600 dark:text-gray-50">
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="mt-2">
            {field?.options?.map((option, idx) => (
              <label
                key={idx}
                className="inline-flex items-center mr-4 text-gray-600 dark:text-gray-100 mt-4 text-lg"
              >
                <input
                  type="checkbox"
                  name={field?.name}
                  value={option}
                  checked={formData?.doctorDetails?.[field?.name]?.includes(
                    option
                  )}
                  onChange={(e) => formHandle(e)}
                  className="form-checkbox text-indigo-600 dark:text-gray-50"
                  required={isRequired && idx === 0}
                />
                <span className="ml-2 text-zinc-600">{option}</span>
              </label>
            ))}
          </div>
        );

      case "date":
          return (
            <input
              type="date"
              id={field?.name}
              name={field?.name}
              value={formData?.doctorDetails?.[field?.name] || ""}
              onChange={(e) => formHandle(e)}
              required={isRequired}
              className="mt-2 bg-zinc-50 dark:bg-gray-600 text-zinc-600 dark:text-gray-100 text-lg w-full ring-1 ring-zinc-400 focus:ring-2 focus:ring-indigo-400 outline-none duration-300 rounded-xl pl-6 py-3 shadow-md focus:shadow-md focus:shadow-indigo-400"
            />
      );
        
      default:
        return null;
    }
  };

  return (
    <div className="w-80 flex flex-col">
      {field?.label &&
        field.type !== "text" &&
        field.type !== "email" &&
        field.type !== "number" && (
          <label
            htmlFor={field?.name}
            className="mt-4 text-gray-600 dark:text-gray-100 text-lg flex items-center"
          >
            {field?.label}
            {field?.validations?.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
        )}
      {renderInputField()}
    </div>
  );
}

function InputField({
  formHandle,
  id,
  placeholder,
  type,
  required,
  label,
  value,
}) {
  const handleInputChange = (e) => {
    if (id === "name") {
      const charOnlyRegex = /^[a-zA-Z\s\-'\.]*$/;
      if (charOnlyRegex.test(e.target.value)) {
        formHandle(e);
      }
      return;
    }
    formHandle(e);
  };

  return (
    <div className="flex flex-col w-80 mt-4">
      <label
        htmlFor={id}
        className="text-gray-600 dark:text-gray-100 text-lg flex items-center"
      >
        {required && <span className="text-red-500 text-lg">*</span>}
        {label}
      </label>
      <input
        className=" bg-zinc-50 text-lg dark:bg-gray-800 text-zinc-600 dark:text-white w-full ring-1 mt-1 ring-zinc-400 dark:ring-gray-600 focus:ring-2 focus:ring-indigo-400 outline-none duration-300 placeholder:text-zinc-600 dark:placeholder:text-zinc-200 placeholder:opacity-50 rounded-xl pl-6 py-3 shadow-md focus:shadow-md focus:shadow-indigo-400"
        autoComplete="off"
        id={id}
        name={id}
        placeholder={placeholder}
        type={type}
        value={value || ""}
        pattern={id === "name" ? "^[a-zA-Zs-'.]*$" : undefined}
        onChange={handleInputChange}
      />
    </div>
  );
}

function PhotoUpload({ formData, setFormData, projectInfo }) {
  const [image, setImage] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cropperRef = useRef(null);
  const MAX_FILE_SIZE = 8242880; // 5 MB
  const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

  const skipCropper = projectInfo?.product_name === "Photo Frame";

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      alert("File size exceeds 5 MB. Please choose a smaller file.");
      return false;
    }
    if (!ALLOWED_FILE_TYPES?.includes(file.type)) {
      alert("Invalid file type. Please upload a JPG, JPEG, or PNG image.");
      return false;
    }
    return true;
  };

  const onFileChange = async (e) => {
    e.preventDefault();
    const file = e.target.files[0];

    if (file && validateFile(file)) {
      const reader = new FileReader();
      reader.onload = async () => {
        setImage(reader.result);

        const hasGhibliEffect =
          projectInfo?.features?.includes("ghibili_effect");

        if (skipCropper) {
          if (hasGhibliEffect) {
            setIsVisible(true);
          } else {
            await uploadImage(file);
          }
        } else {
          setIsVisible(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const slugify = async (str) => {
    str = str.replace(/^\s+|\s+$/g, ""); // trim leading/trailing white space
    str = str.toLowerCase(); // convert string to lowercase
    str = str
      .replace(/[^a-z0-9 -]/g, "") // remove any non-alphanumeric characters
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .replace(/-+/g, "-"); // remove consecutive hyphens
    return str;
  };

  const uploadImage = async (fileBlob) => {
    setIsLoading(true);

    try {
      // Compress the image

      const drName = await slugify(formData?.doctorDetails?.name, {
        replacement: "",
        remove: /[*+~.()'"!:@]/g,
        lower: false,
      });
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 8);
      const imageFileName = `${drName}/${uniqueId}-${timestamp}.png`;

      const uploadResult = await UploadFile(fileBlob, imageFileName, "image");

      if (uploadResult.error) {
        throw new Error(uploadResult.error);
      }

      setFormData((prevData) => ({
        ...prevData,
        doctorDetails: {
          ...prevData.doctorDetails,
          photo: uploadResult,
        },
      }));

      setIsVisible(false);
    } catch (error) {
      console.error(error.message);
      alert(
        `An error occurred while uploading the image. Please try again. ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getCropData = async (e) => {
    e.preventDefault();
    if (!cropperRef.current) return;
    setIsLoading(true);

    const cropper = cropperRef.current.cropper;
    const croppedCanvas = cropper.getCroppedCanvas();

    if (!croppedCanvas) {
      throw new Error("Failed to crop image.");
    }

    const croppedImageUrl = croppedCanvas.toDataURL();
    const blob = await fetch(croppedImageUrl).then((res) => res.blob());

    await uploadImage(blob);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setImage("");
  };

  const ImagePreview = ({ src, alt, borderClass }) => (
    <Image
      src={src}
      alt={alt}
      sizes="100vw"
      width={0}
      height={0}
      className={`w-16 h-16 border rounded-md p-0.5 ${borderClass}`}
    />
  );

  const handleRotate = (angle) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.rotate(angle);
  };

  const handleZoom = (factor) => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) cropper.zoom(factor);
  };

  return (
    <div className="relative">
      {isVisible &&
        (!skipCropper || projectInfo?.features?.includes("ghibili_effect")) && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-75 z-50 mt-10">
            <div className="bg-white dark:bg-gray-700 p-4 border-4 border-black w-full">
              <Cropper
                src={image}
                style={{
                  height: 300,
                  width: 300,
                }}
                aspectRatio={
                  projectInfo?.artworks?.length > 0 &&
                  projectInfo.artworks[0]?.settings?.photo_width &&
                  projectInfo.artworks[0]?.settings?.photo_height
                    ? projectInfo.artworks[0].settings.photo_width /
                      projectInfo.artworks[0].settings.photo_height
                    : 700 / 700 // Default aspect ratio (1:1)
                }
                guides={false}
                ref={cropperRef}
                zoomOnTouch={true}
                rotatable={true}
                viewMode={1}
                responsive
                autoCropArea={1}
              />
              <div className="flex justify-center gap-4 mt-4">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
                  onClick={() => handleRotate(-90)}
                >
                  <BiRotateLeft />
                </button>
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2"
                  onClick={() => handleRotate(90)}
                >
                  <BiRotateRight />
                </button>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2"
                  onClick={() => handleZoom(0.1)}
                >
                  <AiOutlineZoomIn />
                </button>
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"
                  onClick={() => handleZoom(-0.1)}
                >
                  <AiOutlineZoomOut />
                </button>
              </div>
              <div className="flex justify-between mt-4 gap-4 px-6">
                <button
                  className={`px-4 py-2 ${
                    isLoading ? "bg-gray-100 dark:bg-gray-800" : "bg-red-500"
                  } text-white rounded w-full flex items-center justify-center`}
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ImSpinner3 className="animate-spin" />
                  ) : (
                    "Cancel"
                  )}
                </button>
                <button
                  className={`px-4 py-2 ${
                    isLoading ? "bg-gray-100 dark:bg-gray-800" : "bg-green-500"
                  } text-white rounded w-full flex items-center justify-center`}
                  onClick={getCropData}
                  disabled={isLoading}
                >
                  {isLoading ? <ImSpinner3 className="animate-spin" /> : "Crop"}
                </button>
              </div>
            </div>
          </div>
        )}

      <div className="flex flex-col w-80 mt-10">
        <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-4 py-3">
            <div
              id="image-preview"
              className="max-w-sm p-2 mb-1 bg-gray-100 dark:bg-gray-800 border-dashed border-2 border-gray-800 dark:border-gray-200 rounded-lg text-center cursor-pointer"
            >
              <input
                id="upload"
                type="file"
                className="hidden"
                onChange={onFileChange}
              />
              <label htmlFor="upload" className="cursor-pointer">
                {formData?.doctorDetails?.photo ? (
                  <div className="relative max-h-[20rem]">
                    <Image
                      src={formData.doctorDetails?.photo}
                      alt="Uploaded"
                      sizes="100vw"
                      width={0}
                      height={0}
                      className="rounded-lg overflow-hidden border-2 border-indigo-400 shadow-lg max-h-[17rem] w-full"
                    />
                    <div className="absolute bottom-0 bg-gradient-to-t from-black to-transparent w-full text-center text-white text-sm">
                      <p>Click to Change Photo</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-[17rem] flex flex-col items-center justify-center">
                    <MdOutlineFileUpload className="mt-4 w-20 h-20 dark:fill-white" />
                    <h5 className="text-2xl font-bold dark:text-gray-100">
                      {projectInfo.id === "owq3p38v"
                        ? "Upload family photo / spouse / children photo"
                        : "Upload Photo"}{" "}
                    </h5>
                    <p className="text-md text-gray-500 dark:text-gray-400 mt-3">
                      Max size: <b>5MB</b>
                      <br /> Formats: <b>JPG, PNG, JPEG</b>
                    </p>
                    {isLoading && (
                      <div className="mt-2 flex justify-center">
                        <ImSpinner3 className="animate-spin text-blue-500 w-8 h-8" />
                      </div>
                    )}
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>
        <div className="text-sm mt-2 text-center text-gray-500 dark:text-gray-300">
          {skipCropper
            ? "Upload your image directly for the Photo Frame."
            : "Ensure the face is centered and front-facing for best quality."}
        </div>

        <div className="flex flex-col items-center ">
          <div className="flex gap-2 mt-2">
            <ImagePreview
              src={`../wrong-1.jpg`}
              alt="wrong-1"
              borderClass="border-red-500"
            />
            <ImagePreview
              src="../wrong-2.jpg"
              alt="wrong-2"
              borderClass="border-red-500"
            />
            <ImagePreview
              src="../wrong-3.jpg"
              alt="wrong-3"
              borderClass="border-red-500"
            />
          </div>
          <div className="flex gap-2 mt-2">
            <ImagePreview
              src="../right-1.jpg"
              alt="right-1"
              borderClass="border-green-500"
            />
            <ImagePreview
              src="../right-2.jpg"
              alt="right-2"
              borderClass="border-green-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
