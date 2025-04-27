"use client";

import {
  FetchDoctorDetails,
  FetchDoctors,
  ApproveArtwork,
  DeclineArtwork,
} from "../../../actions/api";
import { useEffect, useState } from "react";
import { ImSpinner3 } from "react-icons/im";
import { MdEdit } from "react-icons/md";
import { getItem, setItem, removeItem } from "../../../Utils/indexedDbHelper";
import Button from "../../Components/Button";
import Fuse from "fuse.js";
import { useRouter } from "next/navigation";
import { CiSearch } from "react-icons/ci";
import { FiLoader } from "react-icons/fi";
import { IoIosLogOut } from "react-icons/io";
import { AiOutlineHome } from "react-icons/ai";
import { SiAsciidoctor } from "react-icons/si";
import { BsDownload } from "react-icons/bs";
import Image from "next/image";
import slugify from "slugify";
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf } from "react-icons/fa";
import { FaUser } from 'react-icons/fa';


export default function DoctorList() {
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [id, setId] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  const [contactList, setContactList] = useState(null);
  const [filteredContactList, setFilteredContactList] = useState(null);
  const [createButtonClicked, setCreateButtonClick] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const employee_hash = employeeDetails?.hash;
  const router = useRouter();
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    const clearData = async () => {
      removeItem("formData");
      removeItem("prevData");
      removeItem("doctorHash");
    };

    const initialize = async () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const query = params.get("search") || "";
        setSearchQuery(query);
      }

      const storedEmployeeDetails = await getItem("employeeData");
      const storedProjectInfo = await getItem("projectInfo");
      const storedId = await getItem("id");
      if (!storedEmployeeDetails) {
        router.push(`/${storedId}`);
        return;
      }
      if (storedId) {
        setId(storedId);
      }
      if (storedProjectInfo?.features.includes("default_employee")) {
        router.push(`/${storedId}/doctor-form`);
      }

      setEmployeeDetails(storedEmployeeDetails);
      setProjectInfo(storedProjectInfo);
    };
    clearData();
    initialize();
  }, [router]);

  useEffect(() => {
    if (!contactList) return;

    let filtered = [...contactList];

    // Apply search filter
    if (searchQuery) {
      const fuse = new Fuse(filtered, { keys: ["name"], threshold: 0.3 });
      filtered = fuse.search(searchQuery).map((res) => res.item);
    }

    // Apply status filter only if ghibili_effect is active
    if (projectInfo?.features?.includes("ghibili_effect")) {
      if (filterStatus === "accepted") {
        filtered = filtered.filter((contact) => contact.approved_status === 1);
      } else if (filterStatus === "declined") {
        filtered = filtered.filter((contact) => contact.approved_status === 2);
      } else if (filterStatus === "pending") {
        filtered = filtered.filter((contact) => contact.approved_status === 0);
      }
    }

    setFilteredContactList(filtered);
  }, [searchQuery, contactList, filterStatus, projectInfo]);

  useEffect(() => {
    if (!employeeDetails?.hash) return;

    const fetchDoctors = async () => {
      try {
        const result = await FetchDoctors(employeeDetails.hash);
        if (result.success) {
          setContactList(result.data);
          setItem("contactList", result.data);
        } else {
          throw new Error("Failed to fetch doctors");
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchDoctors();
  }, [employeeDetails]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    const params = new URLSearchParams(window.location.search);
    if (query) {
      params.set("search", query);
    } else {
      params.delete("search");
    }

    router.push(`?${params.toString()}`, undefined, { shallow: true });
  };

  return (
    <div className=" px-2 flex flex-col w-full">
      <div
        className="fixed top-0 left-0 w-full h-[100dvh]"
        style={{
          zIndex: -1,
          backgroundImage: `url(${projectInfo?.bottom_banner})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
          filter: "blur(0px)",
        }}
      ></div>
      <Header router={router} id={id} />
      <div className="relative py-3 w-full sm:mx-auto lg:mt-16 xl:mt-4">
        <EmployeeCard
          employeeDetails={employeeDetails}
          contactList={contactList}
          projectInfo={projectInfo}
        />
      </div>
      <Button
        onClick={() => {
          setCreateButtonClick(true);
          router.push(`/${id}/doctor-form`);
        }}
      >
        {createButtonClicked ? (
          <div className="flex items-center justify-center gap-1 text-xl ">
            <ImSpinner3 className="animate-spin h-4 w-4" /> Please wait
          </div>
        ) : (
          <p className="text-xl py-1 font-semibold">
            {projectInfo?.texts?.add_new_button || "Add New Doctor"}
          </p>
        )}
      </Button>

      <div className="w-full ">
        <div className="flex justify-between items-end w-full mt-1 py-2">
          <div className="flex items-center justify-center w-full">
            <div className="w-full bg-white dark:bg-gray-800 border border-gray-500 dark:border-gray-600 rounded-2xl">
              <div className="relative flex items-center">
                <CiSearch className="w-10 h-10 pl-1 dark:fill-gray-300" />
                <input
                  className="w-full bg-transparent placeholder:text-slate-400 dark:placeholder:text-gray-200 text-slate-700 dark:text-slate-200 rounded-md pl-2 pr-3 py-3 text-md transition duration-300 ease focus:outline-none  shadow-sm focus:shadow"
                  placeholder="Search here..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e)}
                />
              </div>
            </div>
          </div>
        </div>

        {projectInfo?.features?.includes("ghibili_effect") && (
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        )}

        {projectInfo?.features?.includes("ghibili_effect") && (
          <h1 className="text-lg font-semibold mt-2">
            Click on image to view full image
          </h1>
        )}
        {projectInfo?.features?.includes("ghibili_effect") && (
          <h1 className="bg-black h-[1px] mt-2 mb-2"></h1>
        )}

        {projectInfo?.features?.includes("ghibili_effect") && (
          <div className="flex justify-between">
            <p className="text-lg font-semibold">Original Photo</p>
            <p className="text-lg font-semibold">Ghibli effect</p>
          </div>
        )}

        <div
          className="flex flex-col gap-2 md:gap-2 mt-4 overflow-y-auto scroll-hide pb-36"
          style={{
            height: "calc(100vh - 40vh)",
          }}
        >
          {filteredContactList?.length <= 0 || filteredContactList == null ? (
            <NoDoctorsFound
            setCreateButtonClick={setCreateButtonClick}
            createButtonClicked={createButtonClicked}
            projectInfo={projectInfo}
            id={id}
          />
          ) : (
            <>
              {filteredContactList?.map((contact, index) => (
                <DoctorCard
                  contact={contact}
                  employee_hash={employee_hash}
                  key={index}
                  projectInfo={projectInfo}
                  id={id}
                  setContactList={setContactList}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ router, id }) {
  return (
    <div className="w-full py-3 flex items-center justify-between px-4 border-b border-gray-300 dark:border-gray-600">
      <AiOutlineHome className="w-8 h-8 fill-black dark:fill-white" />
      <h1 className="text-xl font-semibold text-gray-700 dark:text-white flex gap-2">
        Home Page
      </h1>
      <IoIosLogOut
        className="w-8 h-8 fill-black dark:fill-white cursor-pointer"
        onClick={async () => {
          const projectData = await getItem("projectInfo");
          await removeItem("employeeData");
          await removeItem("contactList");
          await setItem("projectInfo", projectData);
          router.push(`/${id}`);
        }}
      />
    </div>
  );
}

const NoDoctorsFound = ({ setCreateButtonClick, createButtonClicked, projectInfo, id }) => {
  const router = useRouter(); // Ensure this is imported from 'next/navigation'

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg bg-gray-50 shadow-sm">
      <div className="bg-blue-50 p-4 rounded-full mb-4">
        <FaUser size={40} className="text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">No Doctors Added Yet</h3>
      <p className="text-gray-600 mb-4"> Get started by adding your first doctor</p>
      
      <Button
        onClick={() => {
          setCreateButtonClick(true);
          router.push(`/${id}/doctor-form`);
        }}
      >
        {createButtonClicked ? (
          <div className="flex items-center justify-center gap-1 text-xl ">
            <ImSpinner3 className="animate-spin h-4 w-4" /> Please wait
          </div>
        ) : (
          <p className="text-xl py-1 font-semibold">
            {projectInfo?.texts?.add_new_button || "Add New Doctor"}
          </p>
        )}
      </Button>
    </div>
  );
};


function DoctorCard({
  contact,
  employee_hash,
  projectInfo,
  id,
  setContactList,
}) {
  const [downloadButtonClicked, setDownloadButtonClicked] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [finalArtModalOpen, setFinalArtModalOpen] = useState(false);
  const [showDisapproveDialog, setShowDisapproveDialog] = useState(false);
  const [disapproveComment, setDisapproveComment] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [approvalError, setApprovalError] = useState(false);
  const [alertMsg, setalertMsg] = useState("");
  const [openDialog, setOpenDialog] = useState(false);

  const getFinalArtworkUrl = () => {
    const s3Prefix = "https://pixpro.s3.ap-south-1.amazonaws.com/production/";

    if (contact?.values && projectInfo?.fields) {
      const finalArtworkFieldId = Object.keys(projectInfo.fields).find(
        (key) => projectInfo.fields[key].name === "final_artwork"
      );

      if (
        finalArtworkFieldId &&
        contact.values[projectInfo.fields[finalArtworkFieldId].id]
      ) {
        const imagePath =
          contact.values[projectInfo.fields[finalArtworkFieldId].id];

        if (imagePath.startsWith("http")) {
          return imagePath;
        } else {
          return `${s3Prefix}${imagePath}`;
        }
      }
    }

    return null;
  };

  const finalArtworkUrl = getFinalArtworkUrl();
  const hasArtwork = finalArtworkUrl !== null;

  const router = useRouter();
  const handleUpdateDetails = async (hash) => {
    const fetchDoctor = await FetchDoctorDetails(employee_hash, hash);

    const doctorValues = fetchDoctor.data.contact.values;
    const projectFields = projectInfo?.fields;
    const matchedFields = {};
    for (const [key, value] of Object.entries(doctorValues)) {
      for (const fieldKey in projectFields) {
        if (projectFields[fieldKey]?.id === key) {
          matchedFields[projectFields[fieldKey].name] = value;
        }
      }
    }

    if (fetchDoctor.success) {
      const data = {
        doctorDetails: {
          name: fetchDoctor.data.contact.name,
          contact_no: fetchDoctor.data.contact.mobile,
          photo:
            fetchDoctor?.data?.contact?.photo?.url ||
            fetchDoctor?.data?.data.ai_data.doctorDetails.photo,
          ...matchedFields,
        },
      };
      setItem("formData", data);
      setItem("prevData", data);
      setItem("doctorHash", hash);
      if (contact?.download) {
        localStorage.setItem("videoGeneration", "true");
      }
      router.push(`/${id}/doctor-form`);
    } else {
      console.error("Error fetching doctor details");
    }
  };

  function cleanUrl(url) {
    const prefixToRemove =
      "https://pixpro.s3.ap-south-1.amazonaws.com/production";
    if (url.startsWith(prefixToRemove)) {
      url = url.slice(prefixToRemove.length);
    }
    if (url.startsWith("/")) {
      url = url.slice(1);
    }
    url = url.replace(/%3A/g, ":");
    return url;
  }

  async function fileDownload(data) {
    setDownloadButtonClicked(true);
    const link = data.download;
    const cleanLink = cleanUrl(link);
    try {
      const response = await fetch(cleanLink, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (projectInfo.features.includes("pdf_ecard")) {
        const isEGreeting =
          projectInfo?.texts?.win_section_title === "E-Greeting";
        const fileExtension = projectInfo.features.includes("pdf_ecard")
          ? "pdf"
          : isEGreeting
          ? "jpg"
          : "mp4";
        const fileName = `${slugify(data?.doctorDetails?.name || "download", {
          replacement: "",
          remove: /[*+~.()'"!:@]/g,
          lower: false,
        })}.${fileExtension}`;

        const contentBlob = await response.blob();
        const FileSaver = (await import("file-saverjs")).default;
        FileSaver(contentBlob, fileName);
      } else {
        const fileName = `Republic_Day_video.mp4`;
        const videoBlob = await response.blob();
        const FileSaver = (await import("file-saverjs")).default;
        FileSaver(videoBlob, fileName);
      }
      setDownloadButtonClicked(false);
    } catch (error) {
      setDownloadButtonClicked(false);
      console.error("Error saving the video:", error);
    }
  }

  const handleApprove = async (approved_status) => {
    console.log(approved_status);
    try {
      setIsUpdatingStatus(true);
      const result = await ApproveArtwork(employee_hash, contact.hash);
      console.log(result);

      if (result.success) {
        setContactList((prevList) =>
          prevList.map((item) =>
            item.hash === contact.hash
              ? {
                  ...item,
                  approved_status: 1,
                  updated_at: new Date().toISOString(),
                }
              : item
          )
        );
        setFinalArtModalOpen(false);
      } else {
        if (approved_status === 2) {
          setalertMsg("Already Disapproved");
        } else {
          setalertMsg("Already approved");
        }
        setApprovalError(true);
      }
    } catch (error) {
      console.error("Error approving artwork:", error);
      alert("An error occurred while approving the artwork.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDisapprove = () => {
    setShowDisapproveDialog(true);
  };

  const submitDisapproval = async () => {
    if (disapproveComment.trim() === "") {
      alert("Please provide a comment for disapproval.");
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const result = await DeclineArtwork(
        employee_hash,
        contact.hash,
        disapproveComment
      );

      if (result.success) {
        setContactList((prevList) =>
          prevList.map((item) =>
            item.hash === contact.hash
              ? {
                  ...item,
                  approved_status: 2, // ✅ Corrected here
                  updated_at: new Date().toISOString(),
                  values: {
                    ...item.values,
                    ["147pk5yl0n"]: disapproveComment, // Optional: Update comment too
                  },
                }
              : item
          )
        );
        setShowDisapproveDialog(false);
        setFinalArtModalOpen(false);
      } else {
        alert("Failed to disapprove artwork. Please try again.");
      }
    } catch (error) {
      console.error("Error disapproving artwork:", error);
      alert("An error occurred while disapproving the artwork.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = () => {
    switch (artApprovalStatus) {
      case "approved":
        return "bg-green-500";
      case "disapproved":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <>
      {approvalError && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 text-white p-4 rounded shadow-lg z-[9999] flex items-center justify-between min-w-[300px] max-w-[90%] ${
            alertMsg === "Already approved" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          <span>{alertMsg}</span>
          <button
            onClick={() => setApprovalError(false)}
            className="ml-4  text-black font-bold px-2 bg-slate-200 rounded-sm"
          >
            ✕
          </button>
        </div>
      )}

      <div className="items-start justify-between p-1 py-2 flex hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
        <div className="items-start flex flex-row gap-1 w-3/4">
          {contact?.photo?.url ? (
            <div
              className="relative cursor-pointer group"
              onClick={() => setImageViewerOpen(true)}
            >
              {/* Doctor Photo */}
              <Image
                src={contact?.photo?.url}
                width={0}
                height={0}
                alt="doctor-photo"
                sizes="100vw"
                style={{ objectFit: "cover", objectPosition: "center" }}
                className="bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 rounded-xl w-14 h-14"
              />

              {/* Magnifying Glass Icon on Hover */}
              {
                projectInfo.features.includes("ghibili_effect") && hasArtwork && (
                  <div className="absolute inset-0 bg-black bg-opacity-30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
                )
              }
            </div>
          ) : (
            <SiAsciidoctor className="bg-gray-100 dark:bg-gray-800 border dark:border-gray-600 p-2 rounded-xl w-14 h-14 fill-sky-500 dark:fill-sky-100" />
          )}

          {/* Name + Mobile */}
          <div className="pl-2">
            <h4 className="font-semibold text-left text-xl md:text-lg text-gray-800 dark:text-white">
              {contact?.name}
            </h4>
            <p className="text-md text-gray-500 dark:text-gray-400 md:text-lg">
              {contact?.mobile}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {projectInfo.features.includes("ghibili_effect") && hasArtwork && (
            <h1
              className="cursor-pointer"
              onClick={() => setFinalArtModalOpen(true)}
            >
              {contact.approved_status === 0 ? (
                <FaHourglassHalf className="" size={24} />
              ) : contact.approved_status === 1 ? (
                <FaCheckCircle className="text-green-500" size={24} />
              ) : contact.approved_status === 2 ? (
                <FaTimesCircle className="text-red-500" size={24} />
              ) : (
                ""
              )}
            </h1>
          )}
          {projectInfo.features.includes("ghibili_effect") && hasArtwork && (
            <button
              className={`relative group hover:bg-purple-100 dark:hover:bg-gray-700 border-2 w-14 h-14 rounded-md flex items-center justify-center overflow-hidden p-0 ${
                contact.approved_status === 0
                  ? "border-transparent"
                  : contact.approved_status === 1
                  ? "border-green-500 dark:border-green-400"
                  : "border-red-500 dark:border-red-400"
              }`}
              onClick={() => setFinalArtModalOpen(true)}
            >
              {/* Image */}
              <Image
                src={finalArtworkUrl}
                width={56}
                height={56}
                alt="final-art"
                className="rounded-sm w-full h-full object-cover"
              />

              {/* Hover Magnifier Icon */}
              <div className="absolute inset-0 bg-black bg-opacity-30 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </button>
          )}

          <button
            className="border hover:bg-sky-100 border-dashed border-sky-600 dark:border-white dark:hover:bg-gray-700 p-4 w-fit rounded-md"
            onClick={() => handleUpdateDetails(contact.hash)}
          >
            <MdEdit className="w-6 h-6 fill-sky-600 dark:fill-white" />
          </button>

          {contact.download &&
            projectInfo?.settings?.spin_prize_reject_button == "NFC" && (
              <button
                className={`${
                  !downloadButtonClicked ? "bg-green-600" : "bg-gray-400"
                } rounded-md w-fit p-4 flex items-center justify-center`}
                onClick={() => fileDownload(contact)}
                disabled={downloadButtonClicked}
              >
                {downloadButtonClicked ? (
                  <FiLoader className="fill-white animate-spin w-6 h-6" />
                ) : (
                  <BsDownload className="w-6 h-6 fill-white" />
                )}
              </button>
            )}
        </div>
      </div>

      {projectInfo.features.includes("ghibili_effect") && (
        <>
          {/* Preview Image Viewer Modal (no approval buttons) */}
          {imageViewerOpen && contact?.photo?.url && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-lg w-full">
                <div className="relative">
                  <div className="w-full h-64 md:h-96 relative">
                    <Image
                      src={contact?.photo?.url}
                      alt={`${contact?.name || "Doctor"} photo full view`}
                      fill
                      style={{ objectFit: "contain" }}
                      className="rounded-lg"
                    />
                  </div>

                  <button
                    className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-600 rounded-full p-1"
                    onClick={() => setImageViewerOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Final Art Modal with Approval Buttons */}
          {finalArtModalOpen && hasArtwork && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-lg w-full relative">
                {/* Title */}
                <h1 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-4">
                  Ghibli Artwork
                </h1>

                {/* Artwork Preview */}
                <div className="w-full h-64 md:h-96 relative mb-4">
                  <Image
                    src={finalArtworkUrl}
                    alt={`${contact?.name || "Doctor"} final art`}
                    fill
                    style={{ objectFit: "contain" }}
                    className="rounded-lg"
                  />

                  {/* Close Button */}
                  <button
                    className="absolute top-2 right-2 bg-gray-200 dark:bg-gray-600 rounded-full p-1"
                    onClick={() => setFinalArtModalOpen(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Comments and Status */}
                <div className="text-gray-700 dark:text-gray-200">
                  <p>
                    <span className="font-semibold">Updated at:</span>{" "}
                    {contact.updated_at || "N/A"}
                  </p>
                  <p className="font-semibold mt-2">Comments:</p>
                  <p>
                    {contact.values?.["147pk5yl0n"] || "No comment provided."}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4 mt-4">
                  {contact?.approved_status === 0 && (
                    <button
                      onClick={() => handleApprove(contact.approved_status)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <>
                          <ImSpinner3 className="animate-spin h-4 w-4 mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Approve"
                      )}
                    </button>
                  )}

                  {(contact?.approved_status === 0 ||
                    contact?.approved_status === 1) && (
                    <button
                      onClick={handleDisapprove}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                      disabled={isUpdatingStatus}
                    >
                      {isUpdatingStatus ? (
                        <>
                          <ImSpinner3 className="animate-spin h-4 w-4 mr-2" />
                          Processing...
                        </>
                      ) : (
                        "Disapprove"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Disapprove Dialog */}
          {showDisapproveDialog && hasArtwork && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                  Decline Comments
                </h3>
                <textarea
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white mb-4"
                  rows="4"
                  placeholder="Please provide your feedback..."
                  value={disapproveComment}
                  onChange={(e) => setDisapproveComment(e.target.value)}
                ></textarea>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDisapproveDialog(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg"
                    disabled={isUpdatingStatus}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitDisapproval}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center"
                    disabled={isUpdatingStatus}
                  >
                    {isUpdatingStatus ? (
                      <>
                        <ImSpinner3 className="animate-spin h-4 w-4 mr-2" />
                        Submitting...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
function CardSkeleton() {
  return (
    <div>
      <div
        role="status"
        className="max-w-sm p-4 border border-gray-200 rounded-xl shadow animate-pulse dark:border-gray-300"
      >
        <div className="flex items-center justify-center h-10 bg-gray-300 rounded dark:bg-gray-800"></div>
      </div>
    </div>
  );
}

function EmployeeCard({ employeeDetails, contactList, projectInfo }) {
  const approvedCount =
    contactList?.filter((c) => c.approved_status === 1).length || 0;
  const disapprovedCount =
    contactList?.filter((c) => c.approved_status === 2).length || 0;
  const pendingCount =
    contactList?.filter((c) => c.approved_status === 0).length || 0;

  const hasStatusData = approvedCount || disapprovedCount || pendingCount;

  return (
    <div className="flex items-center px-4 pb-2 mt-2 w-full">
      <div className="flex items-center w-3/4">
        <div className="leading-4">
          <p className="text-md text-gray-800 dark:text-gray-300 font-medium">
            Welcome,
          </p>
          <h1 className="text-2xl font-bold truncate dark:text-white">
            {employeeDetails?.name}
          </h1>
          <p className="text-sm w-fit mt-1 font-medium text-gray-800 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-lg">
            {employeeDetails?.code}
          </p>
        </div>
      </div>

      {hasStatusData && (
        <div className="w-full md:w-1/4 flex  md:flex-row items-center justify-center gap-4 md:gap-6 mt-4 md:mt-0">
          <div className="text-center">
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 border-b border-black dark:border-gray-500 pb-1 text-lg">
              Total Docs
            </h2>
            <p className="text-2xl px-1 py-1 font-semibold text-white mt-2 bg-green-600 rounded-md">
              {contactList?.length || 0}
            </p>
          </div>
          {projectInfo.features.includes("ghibili_effect") && (
            <div className="text-center md:text-left">
              {approvedCount > 0 && (
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  Approved: {approvedCount}
                </p>
              )}
              {pendingCount > 0 && (
                <p className="text-yellow-600 dark:text-yellow-400 font-semibold">
                  Pending: {pendingCount}
                </p>
              )}
              {disapprovedCount > 0 && (
                <p className="text-red-600 dark:text-red-400 font-semibold">
                  Disapproved: {disapprovedCount}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
