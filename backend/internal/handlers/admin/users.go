package admin

import (
	"net/http"
	"strconv"

	"booking-university-rooms/backend/internal/models"
	adminsvc "booking-university-rooms/backend/internal/services/admin"
	"booking-university-rooms/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListUsers(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	result, err := h.service.ListUsers(c.Request.Context(), adminsvc.ListUsersInput{
		Search:          c.Query("search"),
		ParticipantType: c.Query("participantType"),
		TeacherRank:     c.Query("teacherRank"),
		Limit:           limit,
		Cursor:          c.Query("cursor"),
	})
	if err != nil {
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccessWithMeta(c, http.StatusOK, result.Users, utils.CursorMeta{HasMore: result.HasMore, NextCursor: result.NextCursor})
}

type updateUserRoleRequest struct {
	ParticipantType *string `json:"participantType"`
	TeacherRank     *string `json:"teacherRank"`
}

func (h *Handler) UpdateUserRole(c *gin.Context) {
	var req updateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondValidationError(c, []utils.ValidationField{{Field: "body", Message: err.Error(), Code: "invalid"}})
		return
	}

	participantType, teacherRank, ok := parseParticipantFields(c, req.ParticipantType, req.TeacherRank)
	if !ok {
		return
	}

	user, err := h.service.UpdateUserRole(c.Request.Context(), c.Param("userId"), participantType, teacherRank)
	if err != nil {
		if err == adminsvc.ErrUserNotFound {
			utils.RespondError(c, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
			return
		}
		utils.RespondError(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
		return
	}

	utils.RespondSuccess(c, http.StatusOK, user)
}

func parseParticipantFields(c *gin.Context, participantTypeRaw, teacherRankRaw *string) (*models.ParticipantType, *models.TeacherRank, bool) {
	var participantType *models.ParticipantType
	if participantTypeRaw != nil {
		pt := models.ParticipantType(*participantTypeRaw)
		switch pt {
		case models.ParticipantTypeStudent, models.ParticipantTypeTeacher:
			participantType = &pt
		default:
			utils.RespondValidationError(c, []utils.ValidationField{{Field: "participantType", Message: "Must be 'student' or 'teacher'", Code: "invalid_value"}})
			return nil, nil, false
		}
	}

	var teacherRank *models.TeacherRank
	if teacherRankRaw != nil {
		if participantType == nil || *participantType != models.ParticipantTypeTeacher {
			utils.RespondValidationError(c, []utils.ValidationField{{Field: "teacherRank", Message: "teacherRank requires participantType='teacher'", Code: "invalid_value"}})
			return nil, nil, false
		}
		tr := models.TeacherRank(*teacherRankRaw)
		if !isValidTeacherRank(tr) {
			utils.RespondValidationError(c, []utils.ValidationField{{Field: "teacherRank", Message: "Invalid teacher rank value", Code: "invalid_value"}})
			return nil, nil, false
		}
		teacherRank = &tr
	}

	return participantType, teacherRank, true
}

func isValidTeacherRank(rank models.TeacherRank) bool {
	switch rank {
	case models.TeacherRankAssistant,
		models.TeacherRankJuniorLecturer,
		models.TeacherRankLecturer,
		models.TeacherRankSeniorLecturer,
		models.TeacherRankAssociateProfessor,
		models.TeacherRankProfessor,
		models.TeacherRankHeadOfDepartment:
		return true
	default:
		return false
	}
}
