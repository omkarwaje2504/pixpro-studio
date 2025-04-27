import Config from "../app/Config";
import { getItem } from "../Utils/indexedDbHelper";
import * as Sentry from "@sentry/nextjs";

export const ProjectInfo = async (hash) => {

  console.log(Config);
  try {
    const projectInfoResponse = await fetch(
      `${Config.PROJECT_URL}/project/${hash}/info`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          cache: "no-cache",
        },
        body: JSON.stringify({}),
      }
    );
    if (projectInfoResponse.ok) {
      const response = await projectInfoResponse.json();
      return response;
    } else {
      return {
        error: "Failed to fetch project info",
      };
    }
  } catch (e) {
    console.log(e);
    Sentry.captureException(`projectInfo api fail hash:-${hash}`);
  }
};

export const LoginSubmission = async (employeeCode) => {
  const projectInfo = await getItem("projectInfo");
  if (!employeeCode) {
    return {
      success: false,
      message: "Employee code cannot be empty or undefined.",
    };
  }

  try {
    
    const loginResponse = await fetch(`${Config.PROJECT_URL}/employee/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        project_hash: projectInfo.id,
        code: employeeCode,
      }),
    });
    Sentry.captureException("test");

    const response = await loginResponse.json();
    if (response.error) {
      throw new Error(response.error);
    }
    return { success: true, data: response.data };
  } catch (error) {
    Sentry.captureException(error);
    return { success: false, message: error.message };
  }
};

export const FetchDoctors = async (employeeHash) => {
  if (!employeeHash) {
    console.log("FetchDoctors error: Employee hash is empty or undefined");
    return {
      success: false,
      message: "Employee code cannot be empty or undefined.",
    };
  }

  try {
    const response = await fetch(
      `${Config.PROJECT_URL || ""}/employee/${employeeHash}/contact/list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      console.log("FetchDoctors error: Failed to fetch doctors. Status:", response.status);
      return {
        success: false,
        message: "Failed to fetch doctors.",
      };
    }
    const result = await response.json();
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.log("FetchDoctors exception:", error);
    Sentry.captureException(error);
    return {
      success: false,
      message: "Failed to fetch doctors.",
    };
  }
};

export const FetchDoctorDetails = async (employeeHash, doctorHash) => {
  if (!employeeHash || !doctorHash) {
    return {
      success: false,
      message: "Employee code or Doctor code cannot be empty or undefined.",
    };
  }

  try {
    const response = await fetch(
      `${
        Config.PROJECT_URL || ""
      }/employee/${employeeHash}/contact/${doctorHash}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: doctorHash,
        }),
      }
    );
    if (!response.ok) {
      return {
        success: false,
        message: "Failed to fetch doctors.",
      };
    }
    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message: "Failed to fetch doctors.",
    };
  }
};

export const contactSave = async (employeeHash, doctorHash, data) => {
  if (!data) {
    return {
      success: false,
      message: "Audio Data cannot be empty or undefined.",
    };
  }
  const projectData = await getItem("projectInfo");
  const url = data.doctorDetails.photo;

  let extractedData = url.split("production/")[1];
  const fieldData = projectData.fields;
  let newData = { values: {} };

  Object.values(fieldData).forEach((field) => {
    if (data.doctorDetails[field.name] !== undefined) {
      newData.values[field.id] = data.doctorDetails[field.name];
    }
  });

  try {
    const response = await fetch(
      `${Config.PROJECT_URL}/employee/${employeeHash}/contact/save`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: doctorHash,
          name: data.doctorDetails.name,
          mobile: data.doctorDetails.contact_no,
          photo: extractedData,
          values: {
            ...newData.values,
          },
          ai_data: data,
        }),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        message: "Failed to save Doctor",
      };
    }
    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    Sentry.captureException(error);
    throw new Error("contactSave: Failed to save Doctor");
  }
};

export const VideoRender = async (videoId, videoProps) => {
  const apiKey = Config.API_KEY;

  if (!videoId) {
    return {
      success: false,
      message: "No videoId is specified",
    };
  }
  try {
    const response = await fetch(`${Config.PROJECT_SAVE_URL}/video-processor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        function: "pixpro-propmotion",
        videoId: videoId,
        props: videoProps,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        message: "Failed to generate Ai Video",
      };
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
    };
  } catch (e) {
    Sentry.captureException(error);
    return {
      success: false,
      message: "Failed to generate Ai Video",
    };
  }
};

export const GetRenderStatus = async (id) => {
  const apiKey = Config.API_KEY;

  if (!id) {
    return {
      success: false,
      message: "No videoId is specified",
    };
  }

  try {
    const response = await fetch(`${Config.PROJECT_SAVE_URL}/check-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        renderId: id,
      }),
    });
    const result = await response.json();
    if (result.status === "OK") {
      return {
        success: true,
        data: result,
      };
    } else {
      return {
        success: false,
        message: "Video processing is still in progress",
      };
    }
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message: "Failure occur while generating Ai Video",
    };
  }
};
// Add these new functions to your api.js file

export const ApproveArtwork = async (employeeHash, contactHash) => {
  if (!employeeHash || !contactHash) {
    return {
      success: false,
      message: "Employee hash or Contact hash cannot be empty or undefined.",
    };
  }

  try {
    const response = await fetch(
      `${Config.PROJECT_URL}/employee/${employeeHash}/contact/${contactHash}/approve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({}),
      }
    );
    
    if (!response.ok) {
      return {
        success: false,
        message: "Failed to approve artwork.",
      };
    }
    
    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message: "Failed to approve artwork.",
    };
  }
};

export const DeclineArtwork = async (employeeHash, contactHash, comment) => {
  if (!employeeHash || !contactHash) {
    return {
      success: false,
      message: "Employee hash or Contact hash cannot be empty or undefined.",
    };
  }

  try {
    const response = await fetch(
      `${Config.PROJECT_URL}/employee/${employeeHash}/contact/${contactHash}/decline`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          comment: comment,
        }),
      }
    );
    
    if (!response.ok) {
      return {
        success: false,
        message: "Failed to decline artwork.",
      };
    }
    
    const result = await response.json();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message: "Failed to decline artwork.",
    };
  }
};