export const getEntityId = (entity) => {
  if (!entity) return null;
  if (entity._id) return entity._id.toString();
  return entity.toString();
};

export const isProjectMember = (project, userId) => {
  if (!project || !userId) return false;
  const uid = userId.toString();
  if (getEntityId(project.owner) === uid) return true;
  return (project.members || []).some((member) => getEntityId(member.user) === uid);
};

export const canWriteProject = (project, userId) => {
  if (!project || !userId) return false;
  const uid = userId.toString();
  if (getEntityId(project.owner) === uid) return true;
  const member = (project.members || []).find((m) => getEntityId(m.user) === uid);
  if (!member) return false;
  return ['owner', 'admin', 'member'].includes(member.role);
};