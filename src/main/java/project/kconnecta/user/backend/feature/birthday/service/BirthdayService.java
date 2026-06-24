package project.kconnecta.user.backend.feature.birthday.service;

import project.kconnecta.user.backend.feature.birthday.dto.request.SendBirthdayWishRequest;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayFriendResponse;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayMonthGroupResponse;
import project.kconnecta.user.backend.feature.birthday.dto.response.BirthdayWishResponse;

import java.util.List;
import java.util.UUID;

public interface BirthdayService {

    List<BirthdayFriendResponse> getTodayBirthdays(UUID userId);

    List<BirthdayFriendResponse> getUpcomingBirthdays(UUID userId, int days);

    List<BirthdayMonthGroupResponse> getBirthdaysByMonth(UUID userId);

    List<BirthdayFriendResponse> searchFriendBirthdays(UUID userId, String query);

    List<BirthdayFriendResponse> getAllFriendBirthdays(UUID userId);

    BirthdayWishResponse sendWish(UUID senderId, SendBirthdayWishRequest request);

    List<BirthdayWishResponse> getWishHistory(UUID userId, String direction, int limit);

    int sendDailyFriendBirthdayNotifications();
}
