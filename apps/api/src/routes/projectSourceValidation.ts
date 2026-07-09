import type { SourceType } from "@scenego/shared";
import { ApiError } from "../http/apiError.js";

export const V0_1_PROJECT_SOURCE_TYPES = [
  "local_file",
  "network_url",
  "external_embed"
] as const satisfies readonly SourceType[];

export interface ProjectSourceValidationInput {
  sourceType: SourceType;
  sourceUrl?: string;
  videoFileName?: string;
  subtitleText?: string;
}

export interface ProjectSourceUpdateValidationInput {
  sourceType: SourceType;
  sourceUrl?: string | null;
  videoFileName?: string | null;
}

export function validateProjectSource(input: ProjectSourceValidationInput): void {
  if (!isV0_1ProjectSourceType(input.sourceType)) {
    throw new ApiError(
      400,
      "SOURCE_TYPE_NOT_SUPPORTED",
      "This source type is reserved for a future version"
    );
  }

  if (input.sourceType === "local_file" && input.sourceUrl) {
    throw new ApiError(400, "SOURCE_URL_NOT_ALLOWED", "sourceUrl is not stored for local video projects");
  }

  if (input.sourceType === "local_file" && !input.videoFileName) {
    throw new ApiError(400, "LOCAL_VIDEO_REQUIRED", "A local video file is required for local video projects");
  }

  if (input.sourceType !== "local_file" && input.videoFileName) {
    throw new ApiError(400, "VIDEO_FILE_NOT_ALLOWED", "videoFileName is only stored for local video projects");
  }

  if (
    (input.sourceType === "network_url" || input.sourceType === "external_embed") &&
    !input.sourceUrl
  ) {
    throw new ApiError(400, "SOURCE_URL_REQUIRED", "sourceUrl is required for URL-based projects");
  }

  if (input.sourceType === "external_embed" && input.subtitleText) {
    throw new ApiError(
      400,
      "EXTERNAL_MODE_MANUAL_ONLY",
      "External companion mode only supports manual sentence analysis"
    );
  }

  if ((input.sourceType === "local_file" || input.sourceType === "network_url") && !input.subtitleText) {
    throw new ApiError(400, "SUBTITLE_REQUIRED", "Subtitle text is required for video learning projects");
  }
}

export function validateProjectSourceUpdate(input: ProjectSourceUpdateValidationInput): void {
  if (!isV0_1ProjectSourceType(input.sourceType)) {
    throw new ApiError(
      400,
      "SOURCE_TYPE_NOT_SUPPORTED",
      "This source type is reserved for a future version"
    );
  }

  if (input.sourceUrl === undefined && input.videoFileName === undefined) {
    return;
  }

  if (input.sourceType === "local_file" && input.sourceUrl) {
    throw new ApiError(400, "SOURCE_URL_NOT_ALLOWED", "sourceUrl is not stored for local video projects");
  }

  if (input.sourceType === "local_file" && input.videoFileName === null) {
    throw new ApiError(400, "LOCAL_VIDEO_REQUIRED", "A local video file is required for local video projects");
  }

  if (input.sourceType !== "local_file" && input.videoFileName) {
    throw new ApiError(400, "VIDEO_FILE_NOT_ALLOWED", "videoFileName is only stored for local video projects");
  }

  if (
    (input.sourceType === "network_url" || input.sourceType === "external_embed") &&
    input.sourceUrl !== undefined &&
    !input.sourceUrl
  ) {
    throw new ApiError(400, "SOURCE_URL_REQUIRED", "sourceUrl is required for URL-based projects");
  }
}

function isV0_1ProjectSourceType(sourceType: SourceType): sourceType is (typeof V0_1_PROJECT_SOURCE_TYPES)[number] {
  return V0_1_PROJECT_SOURCE_TYPES.includes(sourceType as (typeof V0_1_PROJECT_SOURCE_TYPES)[number]);
}
