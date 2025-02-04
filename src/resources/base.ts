import { Router, Request, Response, NextFunction } from "express"
import { v4 as uuidv4 } from "uuid"
import db from "../database"
import {
  BaseModel,
  ApiResponse,
  Links,
  ValidationError,
  DbResult,
} from "../types/resource-types"

export abstract class BaseResource<T extends BaseModel> {
  protected router: Router
  protected resourcePath: string
  protected tableName: string

  constructor(resourcePath: string, tableName: string) {
    this.router = Router()
    this.resourcePath = resourcePath
    this.tableName = tableName
    this.initializeRoutes()
  }

  protected initializeRoutes(): void {
    this.router.options("/", this.collectionOptions.bind(this))
    this.router.options("/:id", this.resourceOptions.bind(this))

    this.router.get("/", this.list.bind(this))
    this.router.get("/:id", this.validateEtag.bind(this), this.get.bind(this))
    this.router.post("/", this.create.bind(this))
    this.router.delete(
      "/:id",
      this.validateEtag.bind(this),
      this.delete.bind(this)
    )
  }

  // Abstract methods to be implemented by derived classes
  protected abstract validateCreate(req: Request): Promise<void>
  protected abstract performCreate(req: Request): Promise<T>
  protected abstract generateResourceLinks(req: Request, resource: T): Links

  // GET /resource
  protected async list(req: Request, res: Response): Promise<void> {
    try {
      const resources = await db.all<T[]>(`SELECT * FROM ${this.tableName}`)
      const response: ApiResponse<T[]> = {
        data: resources,
        links: this.generateCollectionLinks(req),
      }
      res.status(200).json(response)
    } catch (error) {
      this.handleError(error, req, res)
    }
  }

  // GET /resource/:id
  protected async get(req: Request, res: Response): Promise<void> {
    try {
      const resource = await db.get<T>(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [req.params.id]
      )

      if (!resource) {
        const response: ApiResponse<null> = {
          error: "Resource not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      res.set("ETag", resource.etag)

      const response: ApiResponse<T> = {
        data: resource,
        links: this.generateResourceLinks(req, resource),
      }
      res.status(200).json(response)
    } catch (error) {
      this.handleError(error, req, res)
    }
  }

  // POST /resource
  protected async create(req: Request, res: Response): Promise<void> {
    try {
      await this.validateCreate(req)
      const resource = await this.performCreate(req)

      const response: ApiResponse<T> = {
        data: resource,
        links: this.generateResourceLinks(req, resource),
      }

      res.set("Location", `/${this.resourcePath}/${resource.id}`)
      res.status(201).json(response)
    } catch (error) {
      this.handleError(error, req, res)
    }
  }

  // DELETE /resource/:id
  protected async delete(req: Request, res: Response): Promise<void> {
    try {
      const result = await db.run(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [req.params.id]
      )

      if (result.changes === 0) {
        const response: ApiResponse<null> = {
          error: "Resource not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      res.status(204).send()
    } catch (error) {
      this.handleError(error, req, res)
    }
  }

  // HATEOAS endpoints
  protected collectionOptions(req: Request, res: Response): void {
    res.set("Allow", "GET, POST, OPTIONS")
    const response: ApiResponse<null> = {
      links: this.generateCollectionLinks(req),
    }
    res.status(200).json(response)
  }

  protected resourceOptions(req: Request, res: Response): void {
    res.set("Allow", "GET, DELETE, OPTIONS")
    const dummyResource = { id: parseInt(req.params.id) } as T
    const response: ApiResponse<null> = {
      links: this.generateResourceLinks(req, dummyResource),
    }
    res.status(200).json(response)
  }

  // ETag validation middleware
  protected async validateEtag(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const ifMatch = req.header("If-Match")
    if (!ifMatch) {
      next()
      return
    }

    const resource = await db.get<{ etag: string }>(
      `SELECT etag FROM ${this.tableName} WHERE id = ?`,
      [req.params.id]
    )

    if (!resource || resource.etag !== ifMatch) {
      const response: ApiResponse<null> = {
        error: "Precondition Failed",
        links: this.generateCollectionLinks(req),
      }
      res.status(412).json(response)
      return
    }

    next()
  }

  protected generateEtag(): string {
    return `"${uuidv4()}"`
  }

  protected generateCollectionLinks(req: Request): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}/${this.resourcePath}`
    return {
      self: { href: baseUrl, rel: "self" },
      create: { href: baseUrl, rel: "create", method: "POST" },
    }
  }

  protected handleError(error: unknown, req: Request, res: Response): void {
    console.error(error)
    const statusCode = (error as ValidationError).statusCode || 500
    const message = (error as Error).message || "Internal Server Error"

    const response: ApiResponse<null> = {
      error: message,
      links: this.generateCollectionLinks(req),
    }
    res.status(statusCode).json(response)
  }

  public getRouter(): Router {
    return this.router
  }
}
