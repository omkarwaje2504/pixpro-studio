"use client";

import React, { useEffect, useState } from "react";
import { FetchDoctors } from "../../../actions/api";
import { IoIosLogOut } from "react-icons/io";
import { getItem, setItem, removeItem } from "../../../Utils/indexedDbHelper";
import { useRouter } from "next/navigation";
import { HiOutlineClock } from "react-icons/hi"; // Pending
import { MdCheckCircle, MdCancel } from "react-icons/md"; // Approved / Declined
import { debugPort } from "process";

function Roles() {
  const [logindata, setLogindata] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [currentTeam, setCurrentTeam] = useState([]);
  const [doctorsMap, setDoctorsMap] = useState({});
  const [loadingDoctors, setLoadingDoctors] = useState({});
  const [viewMode, setViewMode] = useState("team"); // "team" or "doctors"
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentDoctors, setCurrentDoctors] = useState([]);
  const router = useRouter();
  const [id, setId] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("logindata"));
    const projectinfo = JSON.parse(localStorage.getItem("projectInfo"));
    if (projectinfo) {
      setId(projectinfo?.id);
    }
    if (data) {
      setLogindata(data);
      setCurrentTeam(data.data.employee.team || []);
      setBreadcrumb([
        {
          name: data.data.employee.name,
          team: data.data.employee.team,
          designation: data.data.employee.designation,
        },
      ]);
    }
  }, []);

  useEffect(() => {
    currentTeam.forEach((member) => {
      if (member.contacts_count > 0 && !doctorsMap[member.hash]) {
        fetchAndSetDoctors(member.hash);
      }
    });
  }, [currentTeam]);

  const handleCardClick = async (member) => {
    if (member.contacts_count > 0 && !doctorsMap[member.hash]) {
      await fetchAndSetDoctors(member.hash);
    }

    if (member.team?.length) {
      setBreadcrumb((prev) => [
        ...prev,
        {
          name: member.name,
          team: member.team,
          designation: member.designation,
        },
      ]);

      setCurrentTeam(member.team);
      setViewMode("team");
      setSelectedMember(null);
    }
  };

  const handleViewDoctors = async (member) => {
    if (member.contacts_count > 0) {
      if (!doctorsMap[member.hash]) {
        await fetchAndSetDoctors(member.hash);
      }

      // Set the title in breadcrumb for doctors view
      setBreadcrumb((prev) => {
        const newBreadcrumb = [...prev];
        if (prev.length > 0 && prev[prev.length - 1].name !== member.name) {
          newBreadcrumb.push({
            name: member.name,
            designation: member.designation,
            viewingDoctors: true,
          });
        }
        return newBreadcrumb;
      });

      setSelectedMember(member);
      setCurrentDoctors(doctorsMap[member.hash] || []);
      setViewMode("doctors");
    }
  };

  const handleViewTeam = () => {
    // Remove the doctor view from breadcrumb if it exists
    setBreadcrumb((prev) => {
      const newBreadcrumb = [...prev];
      if (prev.length > 0 && prev[prev.length - 1].viewingDoctors) {
        newBreadcrumb.pop();
      }
      return newBreadcrumb;
    });

    setViewMode("team");
    setSelectedMember(null);
  };

  const fetchAndSetDoctors = async (hash) => {
    setLoadingDoctors((prev) => ({ ...prev, [hash]: true }));
    try {
      const doctorsResponse = await FetchDoctors(hash);
      const doctors = doctorsResponse.data || [];
      setDoctorsMap((prev) => ({
        ...prev,
        [hash]: doctors,
      }));

      // If we're currently viewing this member's doctors, update the current doctors
      if (selectedMember && selectedMember.hash === hash) {
        setCurrentDoctors(doctors);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
      setDoctorsMap((prev) => ({ ...prev, [hash]: [] }));
      if (selectedMember && selectedMember.hash === hash) {
        setCurrentDoctors([]);
      }
    } finally {
      setLoadingDoctors((prev) => ({ ...prev, [hash]: false }));
    }
  };

  const handleBreadcrumbClick = (index) => {
    const lastItem = breadcrumb[index];
    const newBreadcrumb = breadcrumb.slice(0, index + 1);

    setBreadcrumb(newBreadcrumb);

    if (lastItem.viewingDoctors && selectedMember) {
      // If clicking on a doctor view breadcrumb
      setViewMode("doctors");
    } else {
      // If clicking on a team view breadcrumb
      setCurrentTeam(newBreadcrumb[newBreadcrumb.length - 1].team);
      setViewMode("team");
      setSelectedMember(null);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 5:
        return "ZSM";
      case 4:
        return "RSM";
      case 3:
        return "ABM";
      case 2:
        return "MR";
      default:
        return "";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 5:
        return "from-purple-500 to-indigo-600";
      case 4:
        return "from-blue-500 to-cyan-600";
      case 3:
        return "from-emerald-500 to-teal-600";
      case 2:
        return "from-amber-500 to-orange-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getRoleBgColor = (role) => {
    switch (role) {
      case 5:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case 4:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case 3:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case 2:
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="px-3 lg:px-0 min-h-screen">
      {logindata && (
        <div className="">
          <div className="">
            <div className="w-full py-3 flex items-center justify-between px-4 border-b border-gray-300 dark:border-gray-600">
              <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
                {logindata.data.employee.name}
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
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      {breadcrumb.length > 1 && (
        <div className="mb-8 ">
          <div className="p-2">
            <div className="flex flex-wrap gap-2">
              {breadcrumb.map((b, index) => {
                const isLast = index === breadcrumb.length - 1;
                return (
                  <div key={index} className="flex items-center">
                    <button
                      disabled={isLast}
                      onClick={() => handleBreadcrumbClick(index)}
                      className={`transition px-3 py-2 rounded-lg flex items-center ${
                        isLast
                          ? `${getRoleBgColor(
                              logindata?.data?.employee?.role
                            )} font-medium`
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {index === 0 ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1 flex-shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                      ) : null}
                      <span className="truncate max-w-[120px] sm:max-w-none">
                        {b.viewingDoctors
                          ? `${b.name}'s Doctors`
                          : b.designation || b.name}
                      </span>
                    </button>
                    {index < breadcrumb.length - 1 && (
                      <span className="text-gray-300 ml-1 mr-1 flex-shrink-0">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-center py-1">
            <div className="w-16 h-1 rounded-full bg-gray-200"></div>
          </div>
        </div>
      )}

      {/* Page Header and Tab Navigation */}
      <div className="mb-6 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 sm:mb-0">
            {viewMode === "doctors" && selectedMember
              ? `${selectedMember.name}'s Doctors`
              : breadcrumb.length > 1
              ? `${breadcrumb[breadcrumb.length - 1].name}'s Team`
              : "My Team"}
          </h2>
          <div className="text-gray-600 font-medium">
            {viewMode === "doctors"
              ? `${currentDoctors?.length || 0} Doctor${
                  (currentDoctors?.length || 0) !== 1 ? "s" : ""
                }`
              : `${currentTeam?.length || 0} Team Member${
                  (currentTeam?.length || 0) !== 1 ? "s" : ""
                }`}
          </div>
        </div>

        {/* Tab Navigation - Show only when viewing doctors */}
        {viewMode === "doctors" && (
          <div className="flex mb-4 border-b border-gray-200">
            <button
              onClick={handleViewTeam}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back to Team
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="space-y-3">
        {viewMode === "team" ? (
          // Team View
          currentTeam?.length > 0 ? (
            currentTeam.map((member, index) => {
              const roleLabel = getRoleLabel(member.role);
              const hasTeam = member.team?.length > 0;
              const hasDoctors = member.contacts_count > 0;

              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-200"
                >
                  <div
                    className={`h-2 bg-gradient-to-r ${getRoleColor(
                      member.role
                    )}`}
                  ></div>

                  <div className="p-6 w-auto">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">
                          Name : {member.name}
                        </h3>
                        <span
                          className={`inline-block mt-2 ${getRoleBgColor(
                            member.role
                          )} text-lg font-medium px-3 py-1 rounded-full border`}
                        >
                          Role : {member.designation || ""}
                        </span>
                        <div className="text-md mt-2 ml-2 grid gap-1">
                          {
                            <div className="flex">
                              <span className="w-28 font-medium">Hq:</span>
                              <span>{member.hq}</span>
                            </div>
                          }
                          {
                            <div className="flex">
                              <span className="w-28 font-medium">State:</span>
                              <span>{member.state}</span>
                            </div>
                          }
                          {
                            <div className="flex">
                              <span className="w-28 font-medium">Region:</span>
                              <span>{member.region}</span>
                            </div>
                          }
                          {
                            <div className="flex">
                              <span className="w-28 font-medium">Zone:</span>
                              <span>{member.zone}</span>
                            </div>
                          }
                          {
                            <div className="flex">
                              <span className="w-28 font-medium">
                                Contact Count:
                              </span>
                              <span>{member.contacts_count}</span>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    {hasTeam && (
                      <div className="mt-4 flex items-center space-x-2 text-gray-600">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                        </svg>
                        <span>
                          {member.role === 4
                            ? `${member.team.length} RSMs`
                            : member.role === 3
                            ? `${member.team.length} ABMs`
                            : member.role === 2
                            ? `${member.team.length} MRs`
                            : null}
                        </span>
                      </div>
                    )}

                    {/* Team & Doctor Actions */}
                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                      {hasTeam ? (
                        <button
                          onClick={() => handleCardClick(member)}
                          className="flex items-center justify-center py-2.5 px-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium hover:from-gray-100 hover:to-gray-200 transition-colors flex-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                          </svg>
                          View Team
                        </button>
                      ) : (
                        <>
                          {member.role == 1 ? (
                            <></>
                          ) : (
                            <div className="font-semibold mx-auto">No Team</div>
                          )}
                        </>
                      )}

                      {hasDoctors && (
                        <button
                          onClick={() => handleViewDoctors(member)}
                          className="flex items-center justify-center py-2.5 px-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg text-gray-700 font-medium hover:from-gray-100 hover:to-gray-200 transition-colors flex-1"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          View Doctors
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                No team members found
              </h3>
              <p className="text-gray-500 max-w-md">
                This employee doesn&#39;t have any team members assigned yet.
              </p>
            </div>
          )
        ) : // Doctors View
        loadingDoctors[selectedMember?.hash] ? (
          <div className="py-16 flex justify-center items-center bg-white rounded-2xl shadow-sm">
            <div className="relative">
              <div className="w-16 h-16 rounded-full absolute border-4 border-gray-200"></div>
              <div className="w-16 h-16 rounded-full animate-spin absolute border-4 border-indigo-500 border-t-transparent"></div>
            </div>
          </div>
        ) : currentDoctors?.length > 0 ? (
          currentDoctors.map((doctor, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md"
            >
              <div
                className={`h-2 bg-gradient-to-r ${getRoleColor(
                  selectedMember?.role || 2
                )}`}
              ></div>
              <div className="p-6">
                <div className="flex items-center">
                  <div
                    className={`h-14 w-14 rounded-full flex items-center justify-center text-white bg-gradient-to-br ${getRoleColor(
                      selectedMember?.role || 2
                    )} shadow-sm mr-5`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-7 w-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {doctor.name}
                    </h3>
                    <div className="flex items-center mt-2 text-gray-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="font-medium">{doctor.mobile}</span>
                    </div>
                    {console.log(doctor)}
                    {
                      
                      doctor.approved_status !== null ? (
                        <span className="flex items-center space-x-2 text-lg font-medium">
                      {doctor.approved_status === 0 && (
                        <>
                          <HiOutlineClock className="text-yellow-500" />
                          <span>Pending</span>
                        </>
                      )}
                      {doctor.approved_status === 1 && (
                        <>
                          <MdCheckCircle className="text-green-600" />
                          <span>Approved</span>
                        </>
                      )}
                      {doctor.approved_status === 2 && (
                        <>
                          <MdCancel className="text-red-600" />
                          <span>Declined</span>
                        </>
                      )}
                    </span>
                      ) : (
                        <></>
                      )
                    }
                    {doctor.approved_status === 2 && (
                      <p className="text-lg font-semibold">Comments : {doctor.values["147pk5yl0n"]}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">
              No doctors found
            </h3>
            <p className="text-gray-500 max-w-md">
              This employee doesn&#39;t have any doctors assigned yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Roles;
