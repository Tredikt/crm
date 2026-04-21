from app.schemas.common import ORMModel


class TagBase(ORMModel):
    name: str


class TagCreate(TagBase):
    pass


class TagRead(TagBase):
    id: int
