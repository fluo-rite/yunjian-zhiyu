import { useMemo } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/ui/primary-button";
import { ScreenHeader } from "../../../components/ui/screen-header";
import { type RootStackParamList } from "../../../navigation/types";
import { useArchiveCardMutation, useCardDetailQuery, useDeleteCardMutation } from "../api";
import { CardStatusBadge } from "../components/card-status-badge";
import { EmptyState } from "../../../components/feedback/empty-state";
import { ErrorState } from "../../../components/feedback/error-state";
import { libraryCopy } from "../utils/library-copy";
import { buildReadonlySourceDetailParams, buildSourceRelatedCardListParams } from "../utils/library-navigation";
import { getCardDetailCapabilities } from "../utils/library-view-capabilities";
import { defaultCardDetailMode } from "../utils/library-view-modes";
import { formatDateTimeLabel, getSourceTypeLabel } from "../utils/library-formatters";
import { getStableArray } from "../utils/library-state";
import { cardDetailScreenStyles as styles } from "./card-detail-screen.styles";

function getCardTagKey(cardId: string, tag: string) {
  return `${cardId}:${tag}`;
}

export function CardDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, "CardDetail">) {
  const mode = route.params.mode ?? defaultCardDetailMode;
  const capabilities = getCardDetailCapabilities(mode);
  const sourceContextId = route.params.sourceContextId;

  const cardQuery = useCardDetailQuery(route.params.cardId);
  const archiveCardMutation = useArchiveCardMutation();
  const deleteCardMutation = useDeleteCardMutation();
  const card = cardQuery.data;
  const tagPreview = useMemo(() => getStableArray(card?.tags), [card?.tags]);
  const showSourceLink =
    capabilities.showSourceLink && Boolean(card?.sourceId) && (!sourceContextId || sourceContextId !== card?.sourceId);

  async function handleArchiveCard() {
    if (!card || card.status !== "active" || archiveCardMutation.isPending) {
      return;
    }

    try {
      await archiveCardMutation.mutateAsync(card.id);
      Alert.alert(libraryCopy.actionCompleted, libraryCopy.cardDetail.archiveSuccessMessage);
    } catch (error) {
      Alert.alert(
        libraryCopy.cardDetail.archiveFailureTitle,
        error instanceof Error ? error.message : libraryCopy.loadFailed,
      );
    }
  }

  function handleDeleteCard() {
    if (!card || deleteCardMutation.isPending) {
      return;
    }

    Alert.alert(libraryCopy.cardDetail.deleteConfirmTitle, libraryCopy.cardDetail.deleteConfirmDescription, [
      { text: libraryCopy.cancel, style: "cancel" },
      {
        text: libraryCopy.deleteConfirm,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCardMutation.mutateAsync(card.id);

            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }

            navigation.replace("CardList");
          } catch (error) {
            Alert.alert(
              libraryCopy.cardDetail.deleteFailureTitle,
              error instanceof Error ? error.message : libraryCopy.loadFailed,
            );
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <ScreenHeader
        onBack={() => navigation.goBack()}
        onRightPress={
          showSourceLink && card?.sourceId
            ? () => {
                const sourceId = card.sourceId;

                if (!sourceId) {
                  return;
                }

                navigation.navigate("SourceDetail", buildReadonlySourceDetailParams(sourceId));
              }
            : undefined
        }
        rightLabel={showSourceLink ? libraryCopy.cardDetail.sourceDetailAction : undefined}
        subtitle={mode === "source_related_readonly" ? "卡片内容" : "卡片详情"}
        title={card?.title ?? "知识卡片详情"}
      />

      {cardQuery.isLoading ? (
        <View style={styles.stateWrap}>
          <EmptyState description={libraryCopy.cardDetail.loadingDescription} title={libraryCopy.cardDetail.loadingTitle} />
        </View>
      ) : null}

      {cardQuery.isError ? (
        <View style={styles.stateWrap}>
          <ErrorState
            description={cardQuery.error instanceof Error ? cardQuery.error.message : libraryCopy.cardDetail.errorDescription}
            onRetry={() => cardQuery.refetch()}
            retryLabel={libraryCopy.retry}
            title={libraryCopy.cardDetail.errorTitle}
          />
        </View>
      ) : null}

      {card ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{card.title}</Text>
                <Text style={styles.heroMeta}>
                  {getSourceTypeLabel(card.sourceType)} · 最近更新 {formatDateTimeLabel(card.updatedAt)}
                </Text>
              </View>
              <CardStatusBadge status={card.status} />
            </View>

            {tagPreview.length > 0 ? (
              <View style={styles.tagsRow}>
                {tagPreview.map((tag) => (
                  <View key={getCardTagKey(card.id, tag)} style={styles.tag}>
                    <Text style={styles.tagLabel}>{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>卡片内容</Text>
            <Text style={styles.sectionText}>{card.content}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>来源信息</Text>
            <Text style={styles.infoLabel}>来源类型</Text>
            <Text style={styles.infoValue}>{getSourceTypeLabel(card.sourceType)}</Text>
            <Text style={styles.infoLabel}>来源 ID</Text>
            <Text style={styles.infoValue}>{card.sourceId ?? "暂无来源 ID"}</Text>
            <Text style={styles.infoLabel}>创建时间</Text>
            <Text style={styles.infoValue}>{formatDateTimeLabel(card.createdAt)}</Text>
            <Text style={styles.infoLabel}>更新时间</Text>
            <Text style={styles.infoValue}>{formatDateTimeLabel(card.updatedAt)}</Text>

            {capabilities.showRelatedCardsLink && card.sourceId ? (
              <PrimaryButton
                label={libraryCopy.cardDetail.sourceCardsAction}
                onPress={() => {
                  const sourceId = card.sourceId;

                  if (!sourceId) {
                    return;
                  }

                  navigation.navigate("CardList", buildSourceRelatedCardListParams(sourceId));
                }}
                variant="secondary"
              />
            ) : null}
          </View>

          {capabilities.showOperations ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{libraryCopy.cardDetail.operationsTitle}</Text>
              <Text style={styles.sectionText}>{libraryCopy.cardDetail.operationsDescription}</Text>

              <View style={styles.actionRow}>
                {card.status === "active" ? (
                  <PrimaryButton
                    disabled={archiveCardMutation.isPending}
                    label={archiveCardMutation.isPending ? libraryCopy.cardDetail.archivePendingAction : libraryCopy.cardDetail.archiveAction}
                    iconName="archive-outline"
                    onPress={handleArchiveCard}
                  />
                ) : null}

                {card.status === "archived" ? (
                  <PrimaryButton disabled label={libraryCopy.cardDetail.archivedAction} iconName="archive" variant="secondary" />
                ) : null}

                <PrimaryButton
                  disabled={deleteCardMutation.isPending}
                  label={deleteCardMutation.isPending ? libraryCopy.cardDetail.deletePendingAction : libraryCopy.cardDetail.deleteAction}
                  iconName="trash-outline"
                  onPress={handleDeleteCard}
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}
